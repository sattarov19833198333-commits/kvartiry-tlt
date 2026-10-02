// ===== ЗАГРУЗКА КВАРТИР С СЕРВЕРА =====
const API_BASE = '';
let flats = [];

async function loadFlats() {
    const container = document.getElementById('cards');
    const counter = document.getElementById('catalogCount');

    showSkeletons(6);
    if (counter) counter.textContent = '';

    try {
        const response = await fetch(`${API_BASE}/api/flats`);
        flats = await response.json();
        renderCards(flats);
    } catch (error) {
        console.error('❌ Ошибка загрузки квартир:', error);
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b6359;">Не удалось загрузить квартиры. Проверьте, запущен ли сервер.</p>';
    }
}

// ===== СКЕЛЕТОНЫ =====
function showSkeletons(count) {
    const container = document.getElementById('cards');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line tall"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
        container.appendChild(skeleton);
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====
function renderCards(list) {
    const container = document.getElementById('cards');
    const counter = document.getElementById('catalogCount');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b6359;padding:40px 0;">Ничего не найдено 😔</p>';
        if (counter) counter.textContent = 'Найдено: 0';
        return;
    }

    if (counter) {
        counter.textContent = `Найдено: ${list.length}`;
    }

    list.forEach((flat, index) => {
        const imgSrc = flat.img
            ? (flat.img.startsWith('http') ? flat.img : `${API_BASE}${flat.img}`)
            : 'https://via.placeholder.com/600x400?text=Нет+фото';

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.flatId = flat.id;
        card.style.transitionDelay = `${Math.min(index * 60, 400)}ms`;
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${imgSrc}" alt="${flat.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400?text=Нет+фото'">
            </div>
            <div class="card-body">
                <h4>${flat.title}</h4>
                <div class="price">${flat.price}</div>
                <div class="details">${flat.details}</div>
                ${(flat.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
        `;
        card.addEventListener('click', () => openFlatModal(flat));
        container.appendChild(card);
    });

    requestAnimationFrame(() => {
        observeCards();
    });
}

// ===== АНИМАЦИЯ ПОЯВЛЕНИЯ КАРТОЧЕК =====
function observeCards() {
    const cards = document.querySelectorAll('.card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    cards.forEach(card => observer.observe(card));
}

// ===== ПОИСК =====
document.getElementById('searchBtn').addEventListener('click', () => {
    const type = document.getElementById('dealType').value;
    const district = document.getElementById('district').value.toLowerCase().trim();
    const roomsValue = document.getElementById('rooms').value;

    let filtered = flats.filter(f => f.type === type);

    if (district) {
        filtered = filtered.filter(f =>
            f.details.toLowerCase().includes(district) ||
            f.title.toLowerCase().includes(district)
        );
    }

    if (roomsValue !== 'any') {
        if (roomsValue === 'studio') {
            filtered = filtered.filter(f =>
                f.title.toLowerCase().includes('студия')
            );
        } else {
            const rooms = Number(roomsValue);
            filtered = filtered.filter(f => {
                const match = f.title.match(/(\d+)-комн/);
                return match && Number(match[1]) === rooms;
            });
        }
    }

    renderCards(filtered);
});

// ===== МОДАЛЬНОЕ ОКНО ЗАЯВКИ =====
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const ctaBtn = document.getElementById('ctaBtn');
const leadForm = document.getElementById('leadForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

const API_URL = `${API_BASE}/api/lead`;

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

// ===== МОДАЛКА КВАРТИРЫ =====
const flatModal = document.getElementById('flatModal');
const flatModalClose = document.getElementById('flatModalClose');
const flatModalImg = document.getElementById('flatModalImg');
const flatModalPrice = document.getElementById('flatModalPrice');
const flatModalTitle = document.getElementById('flatModalTitle');
const flatModalDetails = document.getElementById('flatModalDetails');
const flatModalTags = document.getElementById('flatModalTags');
const flatCallBtn = document.getElementById('flatCallBtn');
const flatWhatsappBtn = document.getElementById('flatWhatsappBtn');
const flatTelegramBtn = document.getElementById('flatTelegramBtn');
const flatModalCta = document.getElementById('flatModalCta');
const flatModalShare = document.getElementById('flatModalShare');

// ⚠️ Твой номер телефона
const PHONE = '+79879543812';
const PHONE_CLEAN = PHONE.replace(/\D/g, '');

let currentFlat = null;

function openFlatModal(flat) {
    currentFlat = flat;

    const imgSrc = flat.img
        ? (flat.img.startsWith('http') ? flat.img : `${API_BASE}${flat.img}`)
        : 'https://via.placeholder.com/600x400?text=Нет+фото';

    flatModalImg.src = imgSrc;
    flatModalImg.alt = flat.title;
    flatModalPrice.textContent = flat.price;
    flatModalTitle.textContent = flat.title;
    flatModalDetails.textContent = flat.details || '—';
    flatModalTags.innerHTML = (flat.tags || []).map(t => `<span class="tag">${t}</span>`).join('');

    flatCallBtn.href = `tel:${PHONE}`;
    flatWhatsappBtn.href = `https://wa.me/${PHONE_CLEAN}?text=${encodeURIComponent('Здравствуйте! Интересует: ' + flat.title)}`;
    flatTelegramBtn.href = `https://t.me/+${PHONE_CLEAN}`;

    flatModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFlatModal() {
    flatModal.classList.remove('active');
    document.body.style.overflow = '';
    currentFlat = null;
}

flatModalClose.addEventListener('click', closeFlatModal);

flatModal.addEventListener('click', (e) => {
    if (e.target === flatModal) closeFlatModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && flatModal.classList.contains('active')) {
        closeFlatModal();
    }
});

// Кнопка «Оставить заявку на квартиру»
flatModalCta.addEventListener('click', () => {
    const title = currentFlat ? currentFlat.title : '';
    closeFlatModal();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const messageField = leadForm.querySelector('textarea[name="message"]');
    if (messageField && title) {
        messageField.value = `Интересует: ${title}`;
    }
});

// Кнопка «Поделиться»
flatModalShare.addEventListener('click', async () => {
    if (!currentFlat) return;

    const url = `${window.location.origin}${window.location.pathname}?flat=${currentFlat.id}`;
    const shareData = {
        title: currentFlat.title,
        text: `${currentFlat.title} — ${currentFlat.price}`,
        url: url
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(url);
            flatModalShare.textContent = '✅ Ссылка скопирована';
            setTimeout(() => {
                flatModalShare.textContent = '🔗 Поделиться';
            }, 2000);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Ошибка при поделиться:', error);
        }
    }
});

// ===== ПАРАЛЛАКС БАННЕРА =====
const hero = document.querySelector('.hero');

window.addEventListener('scroll', () => {
    if (hero) {
        const scrolled = window.scrollY;
        if (scrolled < window.innerHeight) {
            hero.style.setProperty('--parallax', `${scrolled * 0.25}px`);
        }
    }
}, { passive: true });

// ===== АВТООТКРЫТИЕ КВАРТИРЫ ПО ССЫЛКЕ =====
function openFlatFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const flatId = params.get('flat');
    if (!flatId || !flats.length) return;

    const flat = flats.find(f => String(f.id) === String(flatId));
    if (flat) {
        setTimeout(() => openFlatModal(flat), 400);
    }
}

// ===== ПЕРВЫЙ РЕНДЕР =====
loadFlats().then(() => {
    openFlatFromUrl();
});