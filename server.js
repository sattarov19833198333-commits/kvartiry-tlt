require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
// Раздаём фронтенд как статику
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== АВТОРИЗАЦИЯ =====
const activeTokens = new Set();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
    const token = req.headers['x-auth-token'];
    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ success: false, error: 'Не авторизован' });
    }
    next();
}

// ===== ЗАГРУЗКА ФАЙЛОВ =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Только изображения'));
    }
});

// ===== ФАЙЛЫ ДАННЫХ =====
const LEADS_FILE = path.join(__dirname, 'leads.json');
const FLATS_FILE = path.join(__dirname, 'flats.json');

function readJSON(file) {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch {
        return [];
    }
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ===== УВЕДОМЛЕНИЯ =====
async function sendToDiscord(lead) {
    const webhook = process.env.DISCORD_WEBHOOK;
    if (!webhook) {
        console.log('⚠️ Discord не настроен — пропускаю');
        return;
    }

    const content = [
        '🏠 **Новая заявка с сайта!**',
        '',
        `👤 **Имя:** ${lead.name || '—'}`,
        `📞 **Телефон:** ${lead.phone || '—'}`,
        `📧 **Email:** ${lead.email || '—'}`,
        `🎯 **Тип сделки:** ${lead.dealType || '—'}`,
        `💬 **Сообщение:** ${lead.message || '—'}`,
        '',
        `🕐 ${new Date().toLocaleString('ru-RU')}`
    ].join('\n');

    try {
        await axios.post(webhook, { content });
        console.log('✅ Уведомление отправлено в Discord');
    } catch (error) {
        console.error('❌ Ошибка Discord:', error.response?.data || error.message);
    }
}

// ===== ПУБЛИЧНЫЕ МАРШРУТЫ =====

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Сервер работает 🚀' });
});

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const validLogin = process.env.ADMIN_LOGIN;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validLogin || !validPassword) {
        return res.status(500).json({ success: false, error: 'Логин/пароль не настроены на сервере' });
    }

    if (login === validLogin && password === validPassword) {
        const token = generateToken();
        activeTokens.add(token);
        console.log('🔐 Успешный вход в админку');
        return res.json({ success: true, token });
    }

    console.log('❌ Неудачная попытка входа, логин:', login);
    return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
});

app.post('/api/lead', async (req, res) => {
    const { name, phone, email, dealType, message } = req.body;

    if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'Имя и телефон обязательны' });
    }

    const lead = {
        id: Date.now(),
        name,
        phone,
        email: email || '',
        dealType: dealType || '',
        message: message || '',
        status: 'new', // new | in_progress | closed
        createdAt: new Date().toISOString(),
        ip: req.ip
    };

    const leads = readJSON(LEADS_FILE);
    leads.push(lead);
    saveJSON(LEADS_FILE, leads);

    console.log('📥 Новая заявка:', lead);
    await sendToDiscord(lead);

    res.json({ success: true, message: 'Заявка принята' });
});

app.get('/api/flats', (req, res) => {
    res.json(readJSON(FLATS_FILE));
});

// ===== ЗАЩИЩЁННЫЕ МАРШРУТЫ =====

// ---------- ЗАЯВКИ ----------

app.get('/api/leads', requireAuth, (req, res) => {
    // Сортируем: новые сверху
    const leads = readJSON(LEADS_FILE).sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    res.json(leads);
});

// Обновить статус заявки
app.put('/api/leads/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const allowed = ['new', 'in_progress', 'closed'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, error: 'Недопустимый статус' });
    }

    const leads = readJSON(LEADS_FILE);
    const index = leads.findIndex(l => l.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }

    leads[index].status = status;
    saveJSON(LEADS_FILE, leads);
    console.log('🔄 Статус заявки', id, '→', status);
    res.json({ success: true, lead: leads[index] });
});

// Удалить заявку
app.delete('/api/leads/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    let leads = readJSON(LEADS_FILE);
    const before = leads.length;
    leads = leads.filter(l => l.id !== id);

    if (leads.length === before) {
        return res.status(404).json({ success: false, error: 'Заявка не найдена' });
    }

    saveJSON(LEADS_FILE, leads);
    console.log('🗑️ Удалена заявка id:', id);
    res.json({ success: true });
});

// ---------- КВАРТИРЫ ----------

app.post('/api/upload', requireAuth, upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }
    const url = `/uploads/${req.file.filename}`;
    console.log('📸 Загружено фото:', url);
    res.json({ success: true, url });
});

app.post('/api/flats', requireAuth, (req, res) => {
    const { title, price, details, tags, type, img } = req.body;

    if (!title || !price) {
        return res.status(400).json({ success: false, error: 'Название и цена обязательны' });
    }

    const flats = readJSON(FLATS_FILE);
    const flat = {
        id: Date.now(),
        title,
        price,
        details: details || '',
        tags: Array.isArray(tags)
            ? tags
            : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        type: type || 'rent',
        img: img || ''
    };
    flats.push(flat);
    saveJSON(FLATS_FILE, flats);

    console.log('🏠 Добавлена квартира:', flat.title);
    res.json({ success: true, flat });
});

app.put('/api/flats/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const { title, price, details, tags, type, img } = req.body;

    if (!title || !price) {
        return res.status(400).json({ success: false, error: 'Название и цена обязательны' });
    }

    const flats = readJSON(FLATS_FILE);
    const index = flats.findIndex(f => f.id === id);

    if (index === -1) {
        return res.status(404).json({ success: false, error: 'Квартира не найдена' });
    }

    flats[index] = {
        ...flats[index],
        title,
        price,
        details: details || '',
        tags: Array.isArray(tags)
            ? tags
            : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        type: type || 'rent',
        img: img || flats[index].img || ''
    };

    saveJSON(FLATS_FILE, flats);
    console.log('✏️ Обновлена квартира id:', id);
    res.json({ success: true, flat: flats[index] });
});

app.delete('/api/flats/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    let flats = readJSON(FLATS_FILE);
    const before = flats.length;
    flats = flats.filter(f => f.id !== id);

    if (flats.length === before) {
        return res.status(404).json({ success: false, error: 'Квартира не найдена' });
    }

    saveJSON(FLATS_FILE, flats);
    console.log('🗑️ Удалена квартира id:', id);
    res.json({ success: true });
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📋 Заявки: http://localhost:${PORT}/api/leads (нужен вход)`);
    console.log(`🏠 Квартиры: http://localhost:${PORT}/api/flats (публично)\n`);
});