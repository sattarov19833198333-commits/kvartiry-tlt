// ===== ЗАГРУЗКА КВАРТИР С СЕРВЕРА =====
const API_BASE = ''; // пустая строка = тот же домен (работает и локально, и на Render)
let flats = [];

async function loadFlats() {
    try {
        const response = await fetch(`${API_BASE}/api/flats`);
        flats = await response.json();
        renderCards(flats);
    } catch (error) {
        console.error('❌ Ошибка загрузки квартир:', error);
        document.getElementById('cards').innerHTML =
            '<p>Не удалось загрузить квартиры. Проверьте, запущен ли сервер.</p>';
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====
function renderCards(list) {
    const container = document.getElementById('cards');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p>Ничего не найдено 😔</p>';
        return;
    }

    list.forEach(flat => {
        const imgSrc = flat.img
            ? (flat.img.startsWith('http') ? flat.img : `${API_BASE}${flat.img}`)
            : 'https://via.placeholder.com/600x400?text=Нет+фото';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${imgSrc}" alt="${flat.title}" onerror="this.src='https://via.placeholder.com/600x400?text=Нет+фото'">
            <div class="card-body">
                <h4>${flat.title}</h4>
                <div class="price">${flat.price}</div>
                <div class="details">${flat.details}</div>
                ${(flat.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

// ===== ПОИСК =====
document.getElementById('searchBtn').addEventListener('click', () => {
    const type = document.getElementById('dealType').value;
    const district = document.getElementById('district').value.toLowerCase().trim();

    let filtered = flats.filter(f => f.type === type);

    if (district) {
        filtered = filtered.filter(f =>
            f.details.toLowerCase().includes(district) ||
            f.title.toLowerCase().includes(district)
        );
    }

    renderCards(filtered);
});

// ===== МОДАЛЬНОЕ ОКНО =====
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const ctaBtn = document.getElementById('ctaBtn');
const leadForm = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

// Адрес API (тот же домен)
const API_URL = `${API_BASE}/api/lead`;

// Открыть модалку
ctaBtn.addEventListener('click', () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    formStatus.textContent = '';
    formStatus.className = 'form-status';
}

// ===== ОТПРАВКА ФОРМЫ =====
leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем...';
    formStatus.textContent = '';
    formStatus.className = 'form-status';

    const data = {
        name: leadForm.name.value,
        phone: leadForm.phone.value,
        email: leadForm.email.value,
        dealType: leadForm.dealType.value,
        message: leadForm.message.value
    };

    console.log('📤 Отправка заявки на:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            formStatus.textContent = '✅ Заявка отправлена! Мы скоро свяжемся с вами.';
            formStatus.className = 'form-status success';
            leadForm.reset();
            setTimeout(() => closeModal(), 3000);
        } else {
            throw new Error(result.error || 'Ошибка сервера');
        }
    } catch (error) {
        console.error('❌ Ошибка:', error);
        formStatus.textContent = '❌ Не удалось отправить. Попробуйте позже.';
        formStatus.className = 'form-status error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
    }
});

// ===== ПЕРВЫЙ РЕНДЕР =====
loadFlats();