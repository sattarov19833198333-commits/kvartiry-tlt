// ===== ДАННЫЕ КВАРТИР =====
const flats = [
    {
        img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
        title: '2-комн. квартира, 65 м²',
        price: '65 000 ₽/мес',
        details: 'м. Тверская • 5 мин пешком',
        tags: ['Аренда', 'С мебелью'],
        type: 'rent'
    },
    {
        img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600',
        title: '1-комн. квартира, 42 м²',
        price: '8 500 000 ₽',
        details: 'м. Арбатская • Новостройка',
        tags: ['Продажа', 'Евроремонт'],
        type: 'sale'
    },
    {
        img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600',
        title: '3-комн. квартира, 89 м²',
        price: '120 000 ₽/мес',
        details: 'м. Парк Победы • Панорамный вид',
        tags: ['Аренда', 'Бизнес-класс'],
        type: 'rent'
    },
    {
        img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
        title: 'Студия, 28 м²',
        price: '45 000 ₽/мес',
        details: 'м. ВДНХ • Дизайнерский ремонт',
        tags: ['Аренда', 'Студия'],
        type: 'rent'
    },
    {
        img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',
        title: '2-комн. квартира, 70 м²',
        price: '12 300 000 ₽',
        details: 'м. Сокол • Кирпичный дом',
        tags: ['Продажа', 'Свободна'],
        type: 'sale'
    },
    {
        img: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600',
        title: '1-комн. квартира, 38 м²',
        price: '55 000 ₽/мес',
        details: 'м. Пушкинская • Рядом с метро',
        tags: ['Аренда', 'Без животных'],
        type: 'rent'
    }
];

// ===== ОТРИСОВКА КАРТОЧЕК =====
function renderCards(list) {
    const container = document.getElementById('cards');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p>Ничего не найдено 😔</p>';
        return;
    }

    list.forEach(flat => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${flat.img}" alt="${flat.title}">
            <div class="card-body">
                <h4>${flat.title}</h4>
                <div class="price">${flat.price}</div>
                <div class="details">${flat.details}</div>
                ${flat.tags.map(t => `<span class="tag">${t}</span>`).join('')}
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

// ===== МОДАЛЬНОЕ ОКНО И ФОРМА =====
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const ctaBtn = document.getElementById('ctaBtn');
const leadForm = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

// ⚠️ Адрес нашего Node.js сервера
const API_BASE = '';

// Открыть модалку
ctaBtn.addEventListener('click', () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Закрыть по крестику
modalClose.addEventListener('click', closeModal);

// Закрыть по клику на фон
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Закрыть по Escape
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

    console.log('📤 Отправляем данные на сервер:', data);
    console.log('📤 URL:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        console.log('📥 Ответ сервера, статус:', response.status);

        const result = await response.json();
        console.log('📥 Данные ответа:', result);

        if (response.ok && result.success) {
            formStatus.textContent = '✅ Заявка отправлена! Мы скоро свяжемся с вами.';
            formStatus.className = 'form-status success';
            leadForm.reset();

            setTimeout(() => closeModal(), 3000);
        } else {
            throw new Error(result.error || 'Ошибка сервера');
        }
    } catch (error) {
        console.error('❌ Ошибка отправки:', error);
        formStatus.textContent = '❌ Не удалось отправить. Проверьте, запущен ли сервер.';
        formStatus.className = 'form-status error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить';
    }
});

// ===== ПЕРВЫЙ РЕНДЕР =====
renderCards(flats);