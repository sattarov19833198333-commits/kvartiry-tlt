const API = '';

// ===== АВТОРИЗАЦИЯ =====
let authToken = localStorage.getItem('adminToken') || null;

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminContent').style.display = 'none';
}

function showAdminContent() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
}

async function login(loginValue, password) {
    const response = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginValue, password })
    });

    const data = await response.json();
    if (response.ok && data.success) {
        authToken = data.token;
        localStorage.setItem('adminToken', authToken);
        return true;
    }
    return false;
}

function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    showLoginScreen();
}

function authFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            'x-auth-token': authToken || ''
        }
    });
}

// ===== ФОРМА ВХОДА =====
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginValue = document.getElementById('loginInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorEl = document.getElementById('loginError');

    errorEl.textContent = '';

    const ok = await login(loginValue, password);
    if (ok) {
        showAdminContent();
        loadFlats();
        loadLeads();
    } else {
        errorEl.textContent = '❌ Неверный логин или пароль';
    }
});

document.getElementById('logoutBtn').addEventListener('click', logout);

// ===== ВКЛАДКИ =====
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(target).classList.add('active');

        if (target === 'tabFlats') loadFlats();
        if (target === 'tabLeads') loadLeads();
    });
});

// ==========================================
// ===== КВАРТИРЫ =====
// ==========================================

const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const imgUrlInput = document.getElementById('imgUrl');

photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    photoPreview.src = URL.createObjectURL(file);
    photoPreview.style.border = '2px dashed #ddd';

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const response = await authFetch(`${API}/api/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            imgUrlInput.value = data.url;
            photoPreview.style.border = '2px solid #27ae60';
            console.log('✅ Фото загружено:', data.url);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки фото:', error);
        alert('Не удалось загрузить фото');
        photoPreview.src = 'https://via.placeholder.com/300x180?text=Ошибка';
    }
});

const addForm = document.getElementById('addFlatForm');
const addBtn = document.getElementById('addBtn');
const addStatus = document.getElementById('addStatus');
const formTitle = document.getElementById('formTitle');
const cancelBtn = document.getElementById('cancelBtn');

let editingId = null;

function startEdit(flat) {
    editingId = flat.id;

    addForm.title.value = flat.title || '';
    addForm.price.value = flat.price || '';
    addForm.details.value = flat.details || '';
    addForm.type.value = flat.type || 'rent';
    addForm.tags.value = (flat.tags || []).join(', ');

    imgUrlInput.value = flat.img || '';
    if (flat.img) {
        photoPreview.src = flat.img.startsWith('http') ? flat.img : `${API}${flat.img}`;
        photoPreview.style.border = '2px solid #27ae60';
    } else {
        photoPreview.src = 'https://via.placeholder.com/300x180?text=Фото+не+выбрано';
        photoPreview.style.border = '2px dashed #ddd';
    }

    formTitle.textContent = '✏️ Редактировать квартиру';
    addBtn.textContent = 'Сохранить изменения';
    cancelBtn.style.display = 'inline-block';

    addStatus.textContent = '';
    addStatus.className = 'status';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    editingId = null;

    addForm.reset();
    imgUrlInput.value = '';
    photoPreview.src = 'https://via.placeholder.com/300x180?text=Фото+не+выбрано';
    photoPreview.style.border = '2px dashed #ddd';

    formTitle.textContent = '➕ Добавить квартиру';
    addBtn.textContent = 'Добавить квартиру';
    cancelBtn.style.display = 'none';

    addStatus.textContent = '';
    addStatus.className = 'status';
}

cancelBtn.addEventListener('click', resetForm);

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    addBtn.disabled = true;
    addBtn.textContent = editingId ? 'Сохраняем...' : 'Добавляем...';
    addStatus.textContent = '';
    addStatus.className = 'status';

    const data = {
        title: addForm.title.value,
        price: addForm.price.value,
        details: addForm.details.value,
        type: addForm.type.value,
        tags: addForm.tags.value,
        img: imgUrlInput.value || ''
    };

    const url = editingId ? `${API}/api/flats/${editingId}` : `${API}/api/flats`;
    const method = editingId ? 'PUT' : 'POST';

    try {
        const response = await authFetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            addStatus.textContent = editingId ? '✅ Изменения сохранены!' : '✅ Квартира добавлена!';
            addStatus.className = 'status success';
            resetForm();
            loadFlats();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        addStatus.textContent = '❌ Не удалось сохранить';
        addStatus.className = 'status error';
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = editingId ? 'Сохранить изменения' : 'Добавить квартиру';
    }
});

async function loadFlats() {
    const list = document.getElementById('adminList');
    const counter = document.getElementById('countFlats');

    try {
        const response = await fetch(`${API}/api/flats`);
        const flats = await response.json();

        counter.textContent = flats.length;

        if (flats.length === 0) {
            list.innerHTML = '<p>Пока нет квартир. Добавьте первую!</p>';
            return;
        }

        list.innerHTML = flats.map(flat => {
            const imgSrc = flat.img
                ? (flat.img.startsWith('http') ? flat.img : `${API}${flat.img}`)
                : 'https://via.placeholder.com/100x70?text=Нет';

            return `
                <div class="admin-item">
                    <img src="${imgSrc}" alt="${flat.title}"
                         onerror="this.src='https://via.placeholder.com/100x70?text=Нет'">
                    <div class="admin-item-info">
                        <h4>${flat.title}</h4>
                        <p><strong>${flat.price}</strong> • ${flat.details || '—'}</p>
                        <p>${(flat.tags || []).map(t => `#${t}`).join(' ')}</p>
                    </div>
                    <button class="btn-edit" onclick="editFlat(${flat.id})">✏️</button>
                    <button class="btn-delete" onclick="deleteFlat(${flat.id})">Удалить</button>
                </div>
            `;
        }).join('');

        window.__flatsCache = flats;
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        list.innerHTML = '<p>Не удалось загрузить квартиры.</p>';
    }
}

window.editFlat = function (id) {
    const flat = (window.__flatsCache || []).find(f => f.id === id);
    if (!flat) return;
    startEdit(flat);
};

async function deleteFlat(id) {
    if (!confirm('Удалить эту квартиру?')) return;

    try {
        const response = await authFetch(`${API}/api/flats/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (response.ok && result.success) {
            if (editingId === id) resetForm();
            loadFlats();
        } else {
            alert('Не удалось удалить');
        }
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        alert('Ошибка сервера');
    }
}

// ==========================================
// ===== ЗАЯВКИ =====
// ==========================================

const STATUS_LABELS = {
    new: '🆕 Новая',
    in_progress: '🔄 В работе',
    closed: '✅ Закрыта'
};

const DEAL_LABELS = {
    rent: 'Аренда',
    sale: 'Продажа',
    rentOut: 'Сдать',
    sell: 'Продать'
};

let leadsCache = [];

async function loadLeads() {
    const list = document.getElementById('leadsList');
    const counter = document.getElementById('countLeads');

    list.innerHTML = '<p>Загрузка...</p>';

    try {
        const response = await authFetch(`${API}/api/leads`);
        if (!response.ok) throw new Error('Ошибка загрузки');

        const leads = await response.json();
        leadsCache = leads;
        counter.textContent = leads.length;

        if (leads.length === 0) {
            list.innerHTML = '<p>Пока нет заявок.</p>';
            return;
        }

        list.innerHTML = leads.map(lead => {
            const date = new Date(lead.createdAt).toLocaleString('ru-RU');
            const status = lead.status || 'new';
            const phoneClean = (lead.phone || '').replace(/\D/g, '');

            return `
                <div class="lead-item status-${status}">
                    <div class="lead-header">
                        <div class="lead-name">${lead.name || '—'}</div>
                        <div class="lead-date">${date}</div>
                    </div>
                    <div class="lead-body">
                        <div class="lead-row">
                            <strong>📞 Телефон:</strong>
                            <a href="tel:${lead.phone}" class="lead-link">${lead.phone || '—'}</a>
                            ${phoneClean ? `
                                <a href="https://wa.me/${phoneClean}" target="_blank" class="lead-action whatsapp">WhatsApp</a>
                                <a href="https://t.me/+${phoneClean}" target="_blank" class="lead-action telegram">Telegram</a>
                            ` : ''}
                        </div>
                        ${lead.email ? `<div class="lead-row"><strong>📧 Email:</strong> <a href="mailto:${lead.email}" class="lead-link">${lead.email}</a></div>` : ''}
                        ${lead.dealType ? `<div class="lead-row"><strong>🎯 Тип:</strong> ${DEAL_LABELS[lead.dealType] || lead.dealType}</div>` : ''}
                        ${lead.message ? `<div class="lead-row"><strong>💬 Сообщение:</strong> ${lead.message}</div>` : ''}
                    </div>
                    <div class="lead-footer">
                        <select class="lead-status-select" onchange="changeStatus(${lead.id}, this.value)">
                            <option value="new" ${status === 'new' ? 'selected' : ''}>🆕 Новая</option>
                            <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>🔄 В работе</option>
                            <option value="closed" ${status === 'closed' ? 'selected' : ''}>✅ Закрыта</option>
                        </select>
                        <button class="btn-delete" onclick="deleteLead(${lead.id})">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('❌ Ошибка загрузки заявок:', error);
        list.innerHTML = '<p>Не удалось загрузить заявки.</p>';
    }
}

window.changeStatus = async function (id, status) {
    try {
        const response = await authFetch(`${API}/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (response.ok) {
            const lead = leadsCache.find(l => l.id === id);
            if (lead) lead.status = status;
            // Обновляем цвет блока
            const item = document.querySelector(`.lead-item[data-id="${id}"]`);
            renderLeadsFromCache();
        } else {
            alert('Не удалось изменить статус');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка сервера');
    }
};

function renderLeadsFromCache() {
    const list = document.getElementById('leadsList');
    if (!list || leadsCache.length === 0) return;

    list.innerHTML = leadsCache.map(lead => {
        const date = new Date(lead.createdAt).toLocaleString('ru-RU');
        const status = lead.status || 'new';
        const phoneClean = (lead.phone || '').replace(/\D/g, '');

        return `
            <div class="lead-item status-${status}" data-id="${lead.id}">
                <div class="lead-header">
                    <div class="lead-name">${lead.name || '—'}</div>
                    <div class="lead-date">${date}</div>
                </div>
                <div class="lead-body">
                    <div class="lead-row">
                        <strong>📞 Телефон:</strong>
                        <a href="tel:${lead.phone}" class="lead-link">${lead.phone || '—'}</a>
                        ${phoneClean ? `
                            <a href="https://wa.me/${phoneClean}" target="_blank" class="lead-action whatsapp">WhatsApp</a>
                            <a href="https://t.me/+${phoneClean}" target="_blank" class="lead-action telegram">Telegram</a>
                        ` : ''}
                    </div>
                    ${lead.email ? `<div class="lead-row"><strong>📧 Email:</strong> <a href="mailto:${lead.email}" class="lead-link">${lead.email}</a></div>` : ''}
                    ${lead.dealType ? `<div class="lead-row"><strong>🎯 Тип:</strong> ${DEAL_LABELS[lead.dealType] || lead.dealType}</div>` : ''}
                    ${lead.message ? `<div class="lead-row"><strong>💬 Сообщение:</strong> ${lead.message}</div>` : ''}
                </div>
                <div class="lead-footer">
                    <select class="lead-status-select" onchange="changeStatus(${lead.id}, this.value)">
                        <option value="new" ${status === 'new' ? 'selected' : ''}>🆕 Новая</option>
                        <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>🔄 В работе</option>
                        <option value="closed" ${status === 'closed' ? 'selected' : ''}>✅ Закрыта</option>
                    </select>
                    <button class="btn-delete" onclick="deleteLead(${lead.id})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteLead = async function (id) {
    if (!confirm('Удалить эту заявку?')) return;

    try {
        const response = await authFetch(`${API}/api/leads/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            leadsCache = leadsCache.filter(l => l.id !== id);
            document.getElementById('countLeads').textContent = leadsCache.length;
            renderLeadsFromCache();
        } else {
            alert('Не удалось удалить');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        alert('Ошибка сервера');
    }
};

document.getElementById('refreshLeads')?.addEventListener('click', loadLeads);

// ===== СТАРТ =====
if (authToken) {
    authFetch(`${API}/api/leads`)
        .then(response => {
            if (response.ok) {
                showAdminContent();
                loadFlats();
                loadLeads();
            } else {
                logout();
            }
        })
        .catch(() => logout());
} else {
    showLoginScreen();
}