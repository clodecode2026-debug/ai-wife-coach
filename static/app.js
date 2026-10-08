// AI Wife Coach — Frontend App Logic (Алина & Психолог-Коуч)

// ==========================================
// 🔒 АВТОРИЗАЦИЯ И ПИН-КОД (2509) ДЛЯ АЛИНЫ
// ==========================================
let enteredPin = '';
const AUTH_TOKEN_KEY = 'alina_auth_token';

function getStoredAuthToken() {
    let token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return token;
    token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return token;
    const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
    if (match) return match[2];
    return null;
}

function saveAuthToken(token) {
    if (!token) return;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    document.cookie = `auth_token=${token}; max-age=315360000; path=/; samesite=lax`;
}

function hideAuthPinModal() {
    const modal = document.getElementById('authPinModal');
    if (modal) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }
}

function showAuthPinModal() {
    const modal = document.getElementById('authPinModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('opacity-0', 'pointer-events-none');
    }
}

function updatePinDots() {
    for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            if (i < enteredPin.length) {
                dot.classList.add('bg-rose-500', 'border-rose-500', 'scale-110');
                dot.classList.remove('bg-white', 'border-rose-300');
            } else {
                dot.classList.remove('bg-rose-500', 'border-rose-500', 'scale-110');
                dot.classList.add('bg-white', 'border-rose-300');
            }
        }
    }
}

async function handlePinInput(digit) {
    if (enteredPin.length >= 4) return;
    enteredPin += digit;
    updatePinDots();
    if (navigator.vibrate) navigator.vibrate(20);

    if (enteredPin.length === 4) {
        const pinToSend = enteredPin;
        try {
            const res = await window.nativeFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinToSend }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                saveAuthToken(data.token);
                if (navigator.vibrate) navigator.vibrate([30, 50, 60]);
                hideAuthPinModal();
                if (typeof loadChatSessions === 'function') loadChatSessions();
                if (typeof loadDossier === 'function') loadDossier();
            } else {
                showPinError();
            }
        } catch (err) {
            showPinError();
        }
    }
}

function handlePinDelete() {
    if (enteredPin.length > 0) {
        enteredPin = enteredPin.slice(0, -1);
        updatePinDots();
        if (navigator.vibrate) navigator.vibrate(15);
    }
}

function showPinError() {
    if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
    const errMsg = document.getElementById('pinErrorMsg');
    if (errMsg) errMsg.classList.remove('opacity-0');
    const dots = document.getElementById('pinDots');
    if (dots) {
        dots.classList.add('animate-shake');
        setTimeout(() => dots.classList.remove('animate-shake'), 400);
    }
    setTimeout(() => {
        enteredPin = '';
        updatePinDots();
        if (errMsg) errMsg.classList.add('opacity-0');
    }, 900);
}

// Перехватчик fetch для прозрачной отправки токена и куки авторизации
if (!window.nativeFetch) {
    window.nativeFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        options = options || {};
        options.headers = options.headers || {};
        const token = getStoredAuthToken();
        if (token) {
            if (options.headers instanceof Headers) {
                if (!options.headers.has('Authorization')) options.headers.set('Authorization', `Bearer ${token}`);
            } else if (!options.headers['Authorization']) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        options.credentials = 'include';
        const response = await window.nativeFetch(url, options);
        if (response.status === 401 && typeof url === 'string' && !url.includes('/api/auth/')) {
            showAuthPinModal();
        }
        return response;
    };
}

// Проверка авторизации при старте (для PWA / iPhone)
function checkInitialAuth() {
    const token = getStoredAuthToken();
    if (token) {
        // Токен уже есть — скрываем экран пин-кода мгновенно!
        hideAuthPinModal();
        window.nativeFetch('/api/auth/check', {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        }).then(r => r.json()).then(data => {
            if (!data.authenticated) {
                showAuthPinModal();
            } else {
                saveAuthToken(token);
            }
        }).catch(() => {
            // Офлайн режим — не блокируем вход
        });
    } else {
        showAuthPinModal();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialAuth);
} else {
    checkInitialAuth();
}

window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('authPinModal');
    if (modal && modal.style.display !== 'none' && !modal.classList.contains('pointer-events-none')) {
        if (e.key >= '0' && e.key <= '9') {
            handlePinInput(e.key);
        } else if (e.key === 'Backspace') {
            handlePinDelete();
        }
    }
});

let currentTab = 'chat';
let sessionId = localStorage.getItem('ai_coach_session_id');
if (!sessionId) {
    sessionId = 'alina_session_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('ai_coach_session_id', sessionId);
}

// Live Voice и Web Audio API (Turn-Taking режим «Вопрос-Ответ»)
let isLiveActive = false;
let liveTurnState = 'IDLE'; // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'
let liveRecognition = null;
let speechRestartTimeout = null;
let audioContext = null;
let analyserNode = null;
let micStream = null;
let animationFrameId = null;
let isAITalking = false;
let currentLiveAudio = null;
let liveSoundEnabled = localStorage.getItem('ai_coach_live_sound') === 'true';
let liveAccumulatedText = '';
let liveTurnAccumulatedText = '';
let liveCurrentSessionFinal = '';
let liveCurrentSessionInterim = '';
let speechSilenceTimer = null;
let LIVE_SILENCE_DELAY_MS = 3000; // 3.0 сек для коуча, 4.5 сек для немецкого
let liveCoachMode = 'coach'; // 'coach' | 'german'
let currentLiveGermanLessonId = 1;

// Платформа немецкого языка (180 дней • A1+ ➔ B1 для Алины)
let currentGermanLevel = localStorage.getItem('ai_coach_german_level') || 'A1+';
window.currentGermanLevel = currentGermanLevel;
let currentGermanMode = 'lessons'; // 'lessons' | 'flashcards' | 'duolingo'
let allGermanCourseData = null;
let currentCourseDay = parseInt(localStorage.getItem('ai_coach_german_day') || '1', 10);
let lessonTimerSeconds = 0;
let lessonTimerInterval = null;
let isLessonTimerRunning = false;
let courseStreak = parseInt(localStorage.getItem('lingo_streak') || '1', 10);
let courseXp = parseInt(localStorage.getItem('lingo_xp') || '0', 10);
let currentFlashcardLessonId = 'all';
let currentFlashcards = [];
let currentCardIdx = 0;
let isCardFlipped = false;
let learnedWords = JSON.parse(localStorage.getItem('ai_coach_learned_words') || '[]');

document.addEventListener('DOMContentLoaded', () => {
    loadSessionsList();
    loadChatHistory();
    loadGermanCourseData();
    loadLibraryBooks();
    loadDossier();
    updateLiveSoundUI();
    updateLearnedCountUI();
    updateCourseProgressUI();

    // Отслеживание онлайн/офлайн статуса сети
    window.addEventListener('online', () => {
        const b = document.getElementById('offlineNetworkBanner');
        if (b) b.classList.add('hidden');
    });
    window.addEventListener('offline', () => {
        const b = document.getElementById('offlineNetworkBanner');
        if (b) b.classList.remove('hidden');
    });
});

// ==========================================
// 1. НАВИГАЦИЯ И ВКЛАДКИ
// ==========================================
function switchTab(tabId) {
    currentTab = tabId;
    const tabs = ['chat', 'live', 'german', 'library', 'dossier'];
    
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btnDesktop = document.getElementById('tab-btn-' + t);
        const btnMobile = document.getElementById('nav-btn-' + t);
        
        if (el) {
            if (t === tabId) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
        
        if (btnDesktop) {
            if (t === tabId) {
                btnDesktop.classList.add('bg-white', 'text-rose-600', 'shadow-sm', 'font-semibold');
                btnDesktop.classList.remove('text-slate-600', 'font-medium');
            } else {
                btnDesktop.classList.remove('bg-white', 'text-rose-600', 'shadow-sm', 'font-semibold');
                btnDesktop.classList.add('text-slate-600', 'font-medium');
            }
        }

        if (btnMobile) {
            if (t === tabId) {
                btnMobile.classList.add('text-rose-600', 'font-semibold');
                btnMobile.classList.remove('text-slate-400', 'font-normal');
            } else {
                btnMobile.classList.remove('text-rose-600', 'font-semibold');
                btnMobile.classList.add('text-slate-400', 'font-normal');
            }
        }
    });

    // Если вышли из Live Voice — останавливаем микрофон
    if (tabId !== 'live' && isLiveActive) {
        stopLiveVoice();
    }

    // Если переключились на другую вкладку с немецкого — сворачиваем полноэкранный Duolingo
    if (tabId !== 'german') {
        const lingoContainer = document.getElementById('lingoAppContainer');
        if (lingoContainer && !lingoContainer.classList.contains('hidden')) {
            lingoContainer.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }
}

// Мобильная поддержка свайп-жестов (Swipe gestures между вкладками на iPhone)
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY || !e.changedTouches || e.changedTouches.length !== 1) return;
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;

    // Горизонтальный свайп с защитой от вертикального скролла
    if (Math.abs(diffX) > 75 && Math.abs(diffY) < 50) {
        const tabs = ['chat', 'live', 'german', 'library', 'dossier'];
        const currentIdx = tabs.indexOf(currentTab);
        if (diffX < 0 && currentIdx < tabs.length - 1) {
            // Свайп влево -> следующая вкладка
            switchTab(tabs[currentIdx + 1]);
        } else if (diffX > 0 && currentIdx > 0) {
            // Свайп вправо -> предыдущая вкладка
            switchTab(tabs[currentIdx - 1]);
        }
    }
    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });

// ==========================================
// 2. CHATGPT-ПОДОБНЫЙ МЕНЕДЖЕР СЕССИЙ (САЙДБАР)
// ==========================================
function toggleSessionsDrawer(forceState) {
    const drawer = document.getElementById('sessionsDrawer');
    const content = document.getElementById('drawerContent');
    if (!drawer || !content) return;

    const isOpen = !drawer.classList.contains('pointer-events-none');
    const newState = forceState !== undefined ? forceState : !isOpen;

    if (newState) {
        drawer.classList.remove('pointer-events-none', 'opacity-0');
        drawer.classList.add('pointer-events-auto', 'opacity-100');
        content.classList.remove('-translate-x-full');
        loadSessionsList();
    } else {
        drawer.classList.add('opacity-0');
        drawer.classList.remove('opacity-100');
        content.classList.add('-translate-x-full');
        setTimeout(() => {
            drawer.classList.add('pointer-events-none');
            drawer.classList.remove('pointer-events-auto');
        }, 300);
    }
}

async function loadSessionsList() {
    const container = document.getElementById('sessionsList');
    if (!container) return;

    try {
        const res = await fetch('/api/sessions');
        if (!res.ok) throw new Error('Failed to load sessions');
        const sessions = await res.json();

        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">Нет сохраненных диалогов</div>';
            return;
        }

        container.innerHTML = '';
        sessions.forEach(s => {
            const isActive = s.id === sessionId || s.id.includes(sessionId);
            const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '';
            const title = s.title || 'Диалог с Алиной';

            const item = document.createElement('div');
            item.className = `p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                isActive ? 'bg-rose-100/90 text-rose-900 font-bold border border-rose-200' : 'bg-slate-50 hover:bg-rose-50 text-slate-700 border border-slate-100'
            }`;
            item.onclick = () => selectSession(s.id);

            item.innerHTML = `
                <div class="flex-1 truncate">
                    <p class="truncate">${escapeHtml(title)}</p>
                    <span class="text-[10px] text-slate-400 font-normal">${dateStr}</span>
                </div>
                <button onclick="event.stopPropagation(); deleteSession('${s.id}')" class="text-slate-400 hover:text-rose-600 p-1 rounded transition" title="Удалить диалог">
                    ✕
                </button>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        container.innerHTML = '<div class="text-center py-4 text-rose-400 text-xs">Ошибка загрузки списка</div>';
    }
}

async function createNewChatSession() {
    try {
        const res = await fetch('/api/sessions', { method: 'POST' });
        const data = await res.json();
        sessionId = data.id;
        localStorage.setItem('ai_coach_session_id', sessionId);

        const container = document.getElementById('chatMessages');
        if (container) {
            container.innerHTML = `
                <div class="flex items-start gap-2.5">
                    <img src="/static/img/coach_avatar.jpg" alt="Coach" class="w-8 h-8 rounded-full object-cover border border-rose-200 shrink-0">
                    <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 max-w-xl text-slate-700 text-xs sm:text-sm shadow-sm">
                        <p class="font-semibold text-rose-900 mb-1">Новый диалог начат ✨</p>
                        <p>Здравствуй, дорогая Алина! Я рядом, о чём ты сейчас думаешь?</p>
                    </div>
                </div>
            `;
        }
        loadSessionsList();
    } catch (e) {
        console.error('Error creating new session:', e);
    }
}

async function selectSession(id) {
    sessionId = id;
    localStorage.setItem('ai_coach_session_id', sessionId);
    toggleSessionsDrawer(false);
    loadChatHistory();
}

async function deleteSession(id) {
    if (!confirm('Удалить эту беседу?')) return;
    try {
        await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
        if (id === sessionId) {
            createNewChatSession();
        } else {
            loadSessionsList();
        }
    } catch (e) {
        console.error('Error deleting session:', e);
    }
}

// ==========================================
// 3. ЧАТ С КОУЧЕМ
// ==========================================
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage(text, 'user');
    const loadingId = appendLoadingMessage();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, session_id: sessionId, is_voice_mode: false })
        });
        const data = await res.json();
        removeLoadingMessage(loadingId);
        appendMessage(data.reply || 'Алина, дорогая, я рядом с тобой.', 'assistant');
        loadSessionsList(); // обновляем название сессии если нужно
    } catch (err) {
        removeLoadingMessage(loadingId);
        appendMessage('Алина, временная заминка связи. Но я всегда рядом!', 'assistant');
    }
}

function appendMessage(text, role, scroll = true) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    
    if (role === 'user') {
        div.className = 'flex items-start justify-end gap-2.5';
        div.innerHTML = `
            <div class="bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl p-3.5 max-w-xl text-xs sm:text-sm shadow-sm">
                <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow shrink-0">Я</div>
        `;
    } else {
        div.className = 'flex items-start gap-2.5';
        const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
        div.innerHTML = `
            <img src="/static/img/coach_avatar.jpg" alt="Coach" class="w-8 h-8 rounded-full object-cover border border-rose-200 shrink-0">
            <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 max-w-xl text-slate-700 text-xs sm:text-sm shadow-sm relative group">
                <p id="${msgId}" class="whitespace-pre-wrap pr-6">${escapeHtml(text)}</p>
                <button onclick="playElementTTS('${msgId}')" class="absolute top-2.5 right-2.5 opacity-60 hover:opacity-100 text-rose-600 p-1 rounded-lg hover:bg-rose-100 transition" title="Озвучить ответ">
                    🔊
                </button>
            </div>
        `;
    }
    container.appendChild(div);
    if (scroll) container.scrollTop = container.scrollHeight;
}

function appendLoadingMessage() {
    const container = document.getElementById('chatMessages');
    const id = 'loading_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex items-start gap-2.5';
    div.innerHTML = `
        <img src="/static/img/coach_avatar.jpg" alt="Coach" class="w-8 h-8 rounded-full object-cover border border-rose-200 shrink-0">
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-slate-500 text-xs shadow-sm flex items-center gap-2">
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></span>
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            <span class="ml-1">Коуч формулирует психологическую рекомендацию...</span>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

async function loadChatHistory() {
    try {
        const res = await fetch(`/api/chat/history?session_id=${sessionId}`);
        if (!res.ok) return;
        const messages = await res.json();
        const container = document.getElementById('chatMessages');
        if (!container) return;

        if (messages && messages.length > 0) {
            container.innerHTML = '';
            messages.forEach(m => {
                appendMessage(m.content, m.role, false);
            });
            container.scrollTop = container.scrollHeight;
        } else {
            container.innerHTML = `
                <div class="flex items-start gap-2.5">
                    <img src="/static/img/coach_avatar.jpg" alt="Coach" class="w-8 h-8 rounded-full object-cover border border-rose-200 shrink-0">
                    <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 max-w-xl text-slate-700 text-xs sm:text-sm shadow-sm">
                        <p class="font-semibold text-rose-900 mb-1">Здравствуй, дорогая Алина! ✨</p>
                        <p>Я твой личный дипломированный психолог-коуч. Я помню всё о твоих целях, немецком языке (B1), ресурсе и поддержке твоего мужа Романа. Что сейчас у тебя на душе? Расскажи — я внимательно слушаю.</p>
                    </div>
                </div>
            `;
        }
    } catch(e) {}
}

function sendMoodPrompt(text) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = text;
        sendMessage();
    }
}

function showRomanLoveNoteModal() {
    const modal = document.createElement('div');
    modal.id = 'romanLoveNoteModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';
    modal.innerHTML = `
        <div class="bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-300 relative text-center">
            <button onclick="document.getElementById('romanLoveNoteModal').remove()" class="absolute top-3 right-3 text-white/70 hover:text-white text-lg">✕</button>
            <div class="text-4xl mb-2">💌</div>
            <h3 class="font-black text-lg">Записка от твоего мужа Романа</h3>
            <p class="text-xs text-rose-100 mt-1 italic">С любовью и бесконечной верой в тебя</p>
            <div class="bg-white/15 backdrop-blur-md rounded-2xl p-4 my-4 text-xs sm:text-sm text-left leading-relaxed border border-white/20">
                «Алиночка, любимая моя! Я каждый день восхищаюсь тем, какая ты сильная, умная и красивая. Я вижу, сколько сил ты вкладываешь в адаптацию и немецкий язык. Помни: ты не одна. Я всегда держу тебя за руку, горжусь каждым твоим шагом и безгранично люблю тебя! Твой Роман ❤️»
            </div>
            <button onclick="document.getElementById('romanLoveNoteModal').remove()" class="w-full py-2.5 bg-white text-rose-600 font-bold rounded-xl text-xs shadow-md hover:bg-rose-50 transition">
                Спасибо, любимый! ✨
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function startGermanPracticeInChat() {
    sendMoodPrompt('Давай проведем 10-минутную практику немецкого языка уровня B1. Задай мне жизненный вопрос или смоделируй ситуацию, а я отвечу на немецком.');
}

// ==========================================
// 4. TTS ОЗВУЧКА
// ==========================================
function playElementTTS(elId) {
    const el = document.getElementById(elId);
    if (el) playTTS(null, el.textContent);
}

async function playTTS(btn, text, voice) {
    try {
        const oldText = btn ? btn.textContent : '🔊';
        if (btn) btn.textContent = '⏳';

        // Очищаем от Markdown, звёздочек и эмодзи перед озвучкой
        let cleanText = (text || '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/[*#`~]/g, '')
            .replace(/[💡🇩🇪🎙️✨⭐🎁📖💬🔥❤️🐢🦉]/g, '')
            .replace(/\s+/g, ' ').trim();

        // Умный выбор голоса
        let selectedVoice = voice;
        if (!selectedVoice) {
            const hasCyrillic = /[а-яА-ЯёЁ]/.test(cleanText);
            const hasLatin = /[a-zA-ZäöüßÄÖÜ]/.test(cleanText);
            if (hasLatin && !hasCyrillic) {
                selectedVoice = "de-DE-KatjaNeural";
            } else if (hasLatin && hasCyrillic) {
                selectedVoice = "de-DE-SeraphinaMultilingualNeural";
            } else {
                selectedVoice = "ru-RU-SvetlanaNeural";
            }
        }

        // Кэширование аудио в оперативной памяти браузера для мгновенного повтора (0 мс задержка)
        window._ttsAudioCache = window._ttsAudioCache || {};
        const cacheKey = selectedVoice + ':' + cleanText;

        if (window._ttsAudioCache[cacheKey]) {
            const cachedAudio = new Audio(window._ttsAudioCache[cacheKey]);
            cachedAudio.play();
            if (btn) btn.textContent = oldText;
            return;
        }

        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, voice: selectedVoice })
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        window._ttsAudioCache[cacheKey] = audioUrl;

        const audio = new Audio(audioUrl);
        audio.play();
        if (btn) btn.textContent = oldText;
    } catch (e) {
        console.error(e);
        if (btn) {
            btn.textContent = '❌';
            setTimeout(() => btn.textContent = '🔊', 2000);
        }
    }
}

// ==========================================
// 5. GOOGLE LIVE VOICE РЕЖИМ & WEB AUDIO API ВИЗУАЛИЗАТОР
// ==========================================
function updateLiveSoundUI() {
    const icon = document.getElementById('liveSoundIcon');
    const text = document.getElementById('liveSoundText');
    const btn = document.getElementById('liveSoundToggleBtn');
    if (icon && text) {
        if (liveSoundEnabled) {
            icon.textContent = '🔊';
            text.textContent = 'Звук: Включен (озвучка активна)';
            if (btn) btn.classList.add('bg-rose-500/30', 'border-rose-400');
            if (btn) btn.classList.remove('bg-white/10', 'border-white/20');
        } else {
            icon.textContent = '🔇';
            text.textContent = 'Звук: Выключен (без звукового сопровождения)';
            if (btn) btn.classList.remove('bg-rose-500/30', 'border-rose-400');
            if (btn) btn.classList.add('bg-white/10', 'border-white/20');
        }
    }
}

let liveSlowVoiceEnabled = localStorage.getItem('ai_coach_live_slow') === 'true';

function updateLiveSlowUI() {
    const text = document.getElementById('liveSlowText');
    const btn = document.getElementById('liveSlowToggleBtn');
    if (text) {
        text.textContent = liveSlowVoiceEnabled ? 'Темп: 0.8x 🐢' : 'Темп: 1.0x';
    }
    if (btn) {
        if (liveSlowVoiceEnabled) {
            btn.classList.add('bg-amber-500/30', 'border-amber-400');
            btn.classList.remove('bg-white/10', 'border-white/20');
        } else {
            btn.classList.remove('bg-amber-500/30', 'border-amber-400');
            btn.classList.add('bg-white/10', 'border-white/20');
        }
    }
}

function toggleSlowVoiceMode() {
    liveSlowVoiceEnabled = !liveSlowVoiceEnabled;
    localStorage.setItem('ai_coach_live_slow', liveSlowVoiceEnabled);
    if (currentLiveAudio) {
        currentLiveAudio.playbackRate = liveSlowVoiceEnabled ? 0.8 : 1.0;
    }
    updateLiveSlowUI();
}

function toggleLiveSound() {
    liveSoundEnabled = !liveSoundEnabled;
    localStorage.setItem('ai_coach_live_sound', liveSoundEnabled);
    if (!liveSoundEnabled && currentLiveAudio) {
        try { currentLiveAudio.pause(); } catch(e){}
        currentLiveAudio = null;
        isAITalking = false;
        if (isLiveActive) startBrowserSpeechRecognition();
    }
    updateLiveSoundUI();
}

async function toggleLiveVoiceState() {
    if (!isLiveActive) {
        startLiveVoice();
    } else {
        // Если коуч сейчас говорит, а пользователь нажал на фото — даем возможность перебить и сразу сказать
        if (liveTurnState === 'SPEAKING' && currentLiveAudio) {
            try { currentLiveAudio.pause(); } catch(e){}
            currentLiveAudio = null;
            passTurnToUser();
            return;
        }
        stopLiveVoice();
    }
}

async function startLiveVoice() {
    isLiveActive = true;
    liveTurnState = 'LISTENING';
    isAITalking = false;
    liveAccumulatedText = '';

    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const transcript = document.getElementById('liveTranscript');
    const halo = document.getElementById('liveAvatarHalo');
    const overlay = document.getElementById('liveListeningOverlay');

    if (statusText) {
        statusText.textContent = (liveCoachMode === 'german') 
            ? '🎙️ Ваша очередь говорить по-немецки... (микрофон включен)' 
            : '🎙️ Слушаю вас, Алина... Говорите свободно! (микрофон включен)';
    }
    if (btn) btn.textContent = 'Завершить разговор';
    if (transcript) transcript.textContent = 'Я слушаю ваш голос...';
    if (overlay) overlay.classList.remove('opacity-0');

    // Подключаем Web Audio API для живой реакции на звук
    initAudioVisualizer();

    startBrowserSpeechRecognition();
}

function stopLiveVoice() {
    isLiveActive = false;
    liveTurnState = 'IDLE';
    isAITalking = false;

    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const overlay = document.getElementById('liveListeningOverlay');
    const halo = document.getElementById('liveAvatarHalo');
    const pauseIndicator = document.getElementById('livePauseIndicator');

    if (statusText) statusText.textContent = 'Разговор завершен. Нажмите на фото, чтобы продолжить.';
    if (btn) btn.textContent = 'Начать говорить';
    if (overlay) overlay.classList.add('opacity-0');
    if (halo) halo.style.transform = 'scale(1)';
    if (pauseIndicator) pauseIndicator.classList.add('hidden');

    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    if (speechRestartTimeout) {
        clearTimeout(speechRestartTimeout);
        speechRestartTimeout = null;
    }
    liveAccumulatedText = '';
    liveTurnAccumulatedText = '';
    liveCurrentSessionFinal = '';
    liveCurrentSessionInterim = '';

    stopAudioVisualizer();
    stopBrowserSpeechRecognition();

    if (currentLiveAudio) {
        try { currentLiveAudio.pause(); } catch(e){}
        currentLiveAudio = null;
    }
}

// Инициализация визуализации для Live Voice (без блокировки микрофона на iPhone)
function initAudioVisualizer() {
    const bars = document.querySelectorAll('.voice-bar');
    const halo = document.getElementById('liveAvatarHalo');
    const ring = document.getElementById('livePulseRing');

    function updateMeter() {
        if (!isLiveActive) return;

        if (liveTurnState === 'LISTENING') {
            // Фаза прослушивания: мягкая живая волна, реагирующая на накопленный текст
            const t = Date.now() / 160;
            const hasText = liveAccumulatedText.length > 0;
            bars.forEach((bar, idx) => {
                const base = Math.sin(t + idx * 0.8) * 0.5 + 0.5;
                const h = hasText ? Math.round(8 + base * 22) : Math.round(4 + base * 12);
                bar.style.height = `${h}px`;
            });
            if (halo && ring) {
                const scale = hasText ? (1.04 + Math.sin(t) * 0.04) : (1.01 + Math.sin(t) * 0.02);
                halo.style.transform = `scale(${scale})`;
                ring.style.borderColor = hasText ? 'rgba(244, 63, 94, 0.9)' : 'rgba(244, 63, 94, 0.4)';
                ring.style.boxShadow = hasText ? '0 0 30px rgba(244, 63, 94, 0.8)' : '0 0 10px rgba(244, 63, 94, 0.3)';
            }
        } else if (liveTurnState === 'SPEAKING') {
            // Фаза ответа коуча: плавная сиреневая волна голоса
            const t = Date.now() / 140;
            bars.forEach((bar, idx) => {
                const wave = Math.sin(t + idx * 0.9) * 0.5 + 0.5;
                bar.style.height = `${Math.round(4 + wave * 22)}px`;
            });
            if (halo && ring) {
                const pulse = Math.sin(t) * 0.04 + 1.02;
                halo.style.transform = `scale(${pulse})`;
                ring.style.borderColor = 'rgba(168, 85, 247, 0.8)';
                ring.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.5)';
            }
        } else {
            // Фаза обработки: спокойное ожидание
            bars.forEach(bar => bar.style.height = '4px');
            if (halo && ring) {
                halo.style.transform = 'scale(1.0)';
                ring.style.borderColor = 'rgba(244, 63, 94, 0.3)';
                ring.style.boxShadow = 'none';
            }
        }

        animationFrameId = requestAnimationFrame(updateMeter);
    }

    updateMeter();
}

function stopAudioVisualizer() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (audioContext) {
        try { audioContext.close(); } catch(e){}
        audioContext = null;
    }
    document.querySelectorAll('.voice-bar').forEach(bar => bar.style.height = '4px');
}

// Надежная остановка микрофона без ложных перезапусков
function stopBrowserSpeechRecognition() {
    if (speechRestartTimeout) {
        clearTimeout(speechRestartTimeout);
        speechRestartTimeout = null;
    }
    if (liveRecognition) {
        try {
            // Отключаем onend и onerror, чтобы программное выключение микрофона не вызывало автостарт
            liveRecognition.onend = null;
            liveRecognition.onerror = null;
            liveRecognition.abort();
        } catch(e){}
        liveRecognition = null;
    }
}

// Надежная очистка от дублей слов и фраз из-за специфики Web Speech API на смартфонах
function deduplicateSpokenText(text) {
    if (!text) return '';
    const clean = text.replace(/\s+/g, ' ').trim();
    const words = clean.split(' ');
    const deduped = [];
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (!w) continue;
        const cleanCurr = w.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
        const cleanPrev = deduped.length > 0 
            ? deduped[deduped.length - 1].toLowerCase().replace(/[^a-zа-яё0-9]/gi, '') 
            : '';
        if (cleanCurr && cleanCurr === cleanPrev) {
            continue;
        }
        deduped.push(w);
    }
    let res = deduped.join(' ');
    // Повторяющиеся фразы из 2-4 слов подряд
    res = res.replace(/\b(\S+(?:\s+\S+){1,3})\s+\1\b/gi, '$1');
    return res.trim();
}

// Запуск прослушивания речи пользователя с непрерывным накоплением фраз
function startBrowserSpeechRecognition() {
    // Включаем микрофон ТОЛЬКО если активен режим Live, наступила очередь Алины (LISTENING) и AI не говорит
    if (!isLiveActive || liveTurnState !== 'LISTENING' || isAITalking) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const tr = document.getElementById('liveTranscript');
        if (tr) tr.textContent = 'Распознавание речи не поддерживается браузером. Напишите текст в поле внизу.';
        return;
    }

    if (liveRecognition) {
        return;
    }

    try {
        const isAndroid = /Android/i.test(navigator.userAgent);
        liveRecognition = new SpeechRecognition();
        liveRecognition.lang = (liveCoachMode === 'german') ? 'de-DE' : 'ru-RU';
        // На Android continuous: true вызывает зацикливание и дублирование фраз в Google Speech Service.
        // Поэтому на Android используем continuous = false с мягким перезапуском на onend.
        liveRecognition.continuous = !isAndroid;
        liveRecognition.interimResults = true;

        let lastSeenFinal = '';
        liveRecognition.onresult = (event) => {
            if (liveTurnState !== 'LISTENING' || isAITalking) return;

            let instanceFinal = '';
            let instanceInterim = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const res = event.results[i];
                const tr = res[0] ? res[0].transcript.trim() : '';
                if (res.isFinal && (res[0].confidence === undefined || res[0].confidence > 0)) {
                    if (tr && tr !== lastSeenFinal) {
                        instanceFinal += tr + ' ';
                        lastSeenFinal = tr;
                    }
                } else if (!res.isFinal) {
                    instanceInterim += tr;
                }
            }

            if (instanceFinal) {
                liveTurnAccumulatedText = deduplicateSpokenText(liveTurnAccumulatedText + ' ' + instanceFinal);
            }
            liveCurrentSessionInterim = instanceInterim;

            // Полный распознанный текст с обязательной дедупликацией
            const fullSpokenText = deduplicateSpokenText(liveTurnAccumulatedText + ' ' + instanceInterim);
            liveAccumulatedText = fullSpokenText;

            const transcript = document.getElementById('liveTranscript');
            const pauseIndicator = document.getElementById('livePauseIndicator');
            const pauseText = document.getElementById('livePauseText');

            if (fullSpokenText.length > 0) {
                if (transcript) transcript.textContent = `Вы: «${fullSpokenText}»`;
                if (pauseIndicator) pauseIndicator.classList.remove('hidden');
                const pauseSec = (LIVE_SILENCE_DELAY_MS / 1000).toFixed(1);
                if (pauseText) pauseText.textContent = `⏳ Пауза (${pauseSec} сек)... Можно продолжать`;

                // Сбрасываем и перезапускаем таймер паузы тишины
                if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
                speechSilenceTimer = setTimeout(() => {
                    const finalToSend = deduplicateSpokenText(liveTurnAccumulatedText + ' ' + liveCurrentSessionInterim);
                    if (finalToSend.length >= 2 && isLiveActive && liveTurnState === 'LISTENING' && !isAITalking) {
                        commitLiveSpeech(finalToSend);
                    }
                }, LIVE_SILENCE_DELAY_MS);
            }
        };

        liveRecognition.onerror = (e) => {
            console.warn('SpeechRecognition error:', e.error);
            if (e.error === 'not-allowed') {
                const tr = document.getElementById('liveTranscript');
                if (tr) tr.textContent = 'Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера.';
            }
        };

        liveRecognition.onend = () => {
            liveCurrentSessionInterim = '';
            liveRecognition = null;

            // Перезапуск микрофона делаем бесшовно: если таймер тишины активен — через 100мс, иначе 400мс
            if (isLiveActive && liveTurnState === 'LISTENING' && !isAITalking) {
                if (speechRestartTimeout) clearTimeout(speechRestartTimeout);
                const restartDelay = speechSilenceTimer ? 100 : 400;
                speechRestartTimeout = setTimeout(() => {
                    if (isLiveActive && liveTurnState === 'LISTENING' && !isAITalking && !liveRecognition) {
                        startBrowserSpeechRecognition();
                    }
                }, restartDelay);
            }
        };

        liveRecognition.start();
    } catch(e) {
        liveRecognition = null;
        console.warn('SpeechRecognition start error:', e);
    }
}

function sendLiveQuickMessage() {
    const input = document.getElementById('liveQuickInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    commitLiveSpeech(text);
}

function commitLiveSpeechImmediately() {
    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    const transcript = document.getElementById('liveTranscript');
    let text = deduplicateSpokenText(liveTurnAccumulatedText + ' ' + liveCurrentSessionInterim);
    if (!text && transcript) {
        text = transcript.textContent.replace(/^Вы:\s*«?/, '').replace(/»?$/, '').trim();
        text = deduplicateSpokenText(text);
    }
    if (text && text.length >= 2) {
        commitLiveSpeech(text);
    }
}

// Человек закончил говорить: микрофон сразу выключается, запрос отправляется коучу
function commitLiveSpeech(text) {
    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    if (speechRestartTimeout) {
        clearTimeout(speechRestartTimeout);
        speechRestartTimeout = null;
    }
    const pauseIndicator = document.getElementById('livePauseIndicator');
    if (pauseIndicator) pauseIndicator.classList.add('hidden');

    const cleanText = deduplicateSpokenText(text);
    if (!cleanText || cleanText.length < 2) return;

    // Очищаем все накопители текущего голосового высказывания
    liveTurnAccumulatedText = '';
    liveCurrentSessionFinal = '';
    liveCurrentSessionInterim = '';
    liveAccumulatedText = '';

    // 1. ПЕРЕХОД В СОСТОЯНИЕ ОБРАБОТКИ
    liveTurnState = 'PROCESSING';
    isAITalking = true;

    // 2. МИКРОФОН ВЫКЛЮЧАЕТСЯ ПОЛНОСТЬЮ
    stopBrowserSpeechRecognition();

    handleLiveUserSpeech(cleanText);
}

let liveAudioQueue = [];
let isPlayingAudioQueue = false;
let liveStreamIsDone = false;

function playNextInAudioQueue() {
    if (liveAudioQueue.length === 0) {
        isPlayingAudioQueue = false;
        if (liveStreamIsDone && isLiveActive && liveTurnState === 'SPEAKING') {
            passTurnToUser();
        }
        return;
    }

    isPlayingAudioQueue = true;
    const nextB64 = liveAudioQueue.shift();

    try {
        const binaryStr = atob(nextB64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        currentLiveAudio = new Audio(URL.createObjectURL(blob));
        if (liveSlowVoiceEnabled) {
            currentLiveAudio.playbackRate = 0.8;
        }

        currentLiveAudio.onended = () => {
            currentLiveAudio = null;
            playNextInAudioQueue();
        };

        currentLiveAudio.onerror = () => {
            currentLiveAudio = null;
            playNextInAudioQueue();
        };

        currentLiveAudio.play().catch(() => {
            playNextInAudioQueue();
        });
    } catch(e) {
        playNextInAudioQueue();
    }
}

async function handleLiveUserSpeech(text) {
    if (!isLiveActive) return;
    liveTurnState = 'PROCESSING';
    isAITalking = true;

    // Гарантируем, что микрофон выключен во время обдумывания
    stopBrowserSpeechRecognition();

    const statusText = document.getElementById('liveStatusText');
    const transcript = document.getElementById('liveTranscript');

    if (statusText) statusText.textContent = '🤔 Обдумываю ответ... (микрофон выключен)';
    if (transcript) transcript.textContent = `Вы: «${text}»`;

    // Сброс очередей стриминга
    liveAudioQueue = [];
    isPlayingAudioQueue = false;
    liveStreamIsDone = false;

    // 1. Попытка мгновенного потокового ответа по предложениям (~500 мс до первого звука)
    let streamSuccess = false;
    try {
        const streamRes = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                session_id: sessionId,
                is_voice_mode: true,
                mode: liveCoachMode,
                german_lesson_id: currentLiveGermanLessonId
            })
        });

        if (streamRes.ok && streamRes.body) {
            const reader = streamRes.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let streamBuffer = '';
            let accumulatedReply = '';

            liveTurnState = 'SPEAKING';
            if (statusText) statusText.textContent = '🔊 Коуч отвечает... (микрофон выключен)';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                streamBuffer += decoder.decode(value, { stream: true });
                const lines = streamBuffer.split('\n\n');
                streamBuffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.replace('data: ', '').trim();
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.type === 'chunk') {
                                streamSuccess = true;
                                accumulatedReply += (accumulatedReply ? ' ' : '') + data.text;
                                if (transcript) transcript.textContent = accumulatedReply;

                                if (liveSoundEnabled && data.audio_base64) {
                                    liveAudioQueue.push(data.audio_base64);
                                    if (!isPlayingAudioQueue) {
                                        playNextInAudioQueue();
                                    }
                                }
                            } else if (data.type === 'done') {
                                liveStreamIsDone = true;
                                if (transcript && data.full_text) {
                                    transcript.textContent = data.full_text;
                                }
                                if (!liveSoundEnabled) {
                                    const waitMs = Math.max(2500, Math.min(6000, (data.full_text || '').length * 40));
                                    setTimeout(() => {
                                        if (isLiveActive && liveTurnState === 'SPEAKING') {
                                            passTurnToUser();
                                        }
                                    }, waitMs);
                                } else if (!isPlayingAudioQueue && liveAudioQueue.length === 0) {
                                    passTurnToUser();
                                }
                            }
                        } catch(e){}
                    }
                }
            }
            if (streamSuccess) return;
        }
    } catch(streamErr) {
        console.warn('Streaming notice, fallback to standard endpoint:', streamErr);
    }

    // 2. Резервный вызов стандартного эндпоинта /api/chat
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                session_id: sessionId,
                is_voice_mode: true,
                mode: liveCoachMode,
                german_lesson_id: currentLiveGermanLessonId
            })
        });
        const data = await res.json();
        const reply = data.reply || 'Алина, я рядом и слышу каждое твоё слово.';

        if (!isLiveActive) return;

        if (transcript) transcript.textContent = reply;

        liveTurnState = 'SPEAKING';
        if (statusText) statusText.textContent = '🔊 Коуч отвечает... (микрофон выключен)';

        if (liveSoundEnabled) {
            if (data.audio_base64) {
                await playLiveAudioBase64(data.audio_base64);
            } else {
                await playLiveTTS(reply);
            }
        } else {
            const waitMs = Math.max(2500, Math.min(6000, reply.length * 40));
            setTimeout(() => {
                if (isLiveActive && liveTurnState === 'SPEAKING') {
                    passTurnToUser();
                }
            }, waitMs);
        }
    } catch(e) {
        if (statusText) statusText.textContent = 'Заминка связи. Слушаю снова...';
        if (isLiveActive) {
            setTimeout(() => {
                passTurnToUser();
            }, 1000);
        }
    }
}

// Воспроизведение ответа коуча: микрофон выключен, после окончания аудио — микрофон включается
async function playLiveTTS(text) {
    return new Promise(async (resolve) => {
        try {
            const statusText = document.getElementById('liveStatusText');
            if (statusText) statusText.textContent = '🔊 Коуч отвечает... (микрофон выключен)';

            // Во время ответа коуча микрофон строго выключен
            stopBrowserSpeechRecognition();

            // Полная очистка от markdown, звездочек и эмодзи перед синтезом речи
            let cleanText = (text || '')
                .replace(/\*\*([^*]+)\*\*/g, '$1')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/__([^_]+)__/g, '$1')
                .replace(/_([^_]+)_/g, '$1')
                .replace(/[*#`~]/g, '')
                .replace(/«|»/g, '"')
                .replace(/—|–/g, ' - ')
                .replace(/[💡🇩🇪🎙️✨⭐🎁📖💬🔥❤️🐢🦉]/g, '')
                .replace(/\s+/g, ' ').trim();

            const voiceToUse = (liveCoachMode === 'german') 
                ? "de-DE-SeraphinaMultilingualNeural" 
                : "ru-RU-SvetlanaNeural";

            const res = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText, voice: voiceToUse })
            });

            if (!res.ok) {
                if (isLiveActive) passTurnToUser();
                resolve();
                return;
            }

            const blob = await res.blob();
            currentLiveAudio = new Audio(URL.createObjectURL(blob));
            if (liveSlowVoiceEnabled) {
                currentLiveAudio.playbackRate = 0.8;
            }

            // КАК ТОЛЬКО КОУЧ ИЛИ ТРЕНЕР ЗАКОНЧИЛ ГОВОРИТЬ -> ВКЛЮЧАЕТСЯ МИКРОФОН (ВОПРОС-ОТВЕТ)
            currentLiveAudio.onended = () => {
                currentLiveAudio = null;
                if (isLiveActive) {
                    passTurnToUser();
                }
                resolve();
            };

            currentLiveAudio.onerror = () => {
                currentLiveAudio = null;
                if (isLiveActive) {
                    passTurnToUser();
                }
                resolve();
            };

            await currentLiveAudio.play();
        } catch(e) {
            currentLiveAudio = null;
            if (isLiveActive) {
                passTurnToUser();
            }
            resolve();
        }
    });
}

// Мгновенное воспроизведение готового аудиопотока из base64 без повторных HTTP-запросов (минимальная задержка)
async function playLiveAudioBase64(base64Data) {
    return new Promise(async (resolve) => {
        try {
            const statusText = document.getElementById('liveStatusText');
            if (statusText) statusText.textContent = '🔊 Коуч отвечает... (микрофон выключен)';
            stopBrowserSpeechRecognition();

            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });

            currentLiveAudio = new Audio(URL.createObjectURL(blob));
            if (liveSlowVoiceEnabled) {
                currentLiveAudio.playbackRate = 0.8;
            }

            currentLiveAudio.onended = () => {
                currentLiveAudio = null;
                if (isLiveActive) {
                    passTurnToUser();
                }
                resolve();
            };

            currentLiveAudio.onerror = () => {
                currentLiveAudio = null;
                if (isLiveActive) {
                    passTurnToUser();
                }
                resolve();
            };

            await currentLiveAudio.play();
        } catch(e) {
            currentLiveAudio = null;
            if (isLiveActive) passTurnToUser();
            resolve();
        }
    });
}

// Автоматическая передача слова человеку в режиме «Вопрос-Ответ»: включается микрофон
function passTurnToUser() {
    if (!isLiveActive) return;

    liveTurnState = 'LISTENING';
    isAITalking = false;
    liveTurnAccumulatedText = '';
    liveCurrentSessionFinal = '';
    liveCurrentSessionInterim = '';
    liveAccumulatedText = '';

    const statusText = document.getElementById('liveStatusText');
    if (statusText) {
        statusText.textContent = (liveCoachMode === 'german') 
            ? '🎙️ Ваша очередь говорить по-немецки... (микрофон включен)' 
            : '🎙️ Ваша очередь говорить... Я слушаю! (микрофон включен)';
    }

    const pauseIndicator = document.getElementById('livePauseIndicator');
    if (pauseIndicator) pauseIndicator.classList.add('hidden');

    // Небольшая пауза 400мс для плавного переключения аудиоканала смартфона
    setTimeout(() => {
        if (isLiveActive && liveTurnState === 'LISTENING') {
            startBrowserSpeechRecognition();
        }
    }, 400);
}

// Голосовой ввод в текстовый чат
function toggleRecordVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('Голосовой ввод не поддерживается вашим браузером.');
        return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = text;
            sendMessage();
        }
    };
    rec.start();
}

// =========================================================================
// 6. ПЛАТФОРМА DUOLINGO DEUTSCH ДЛЯ АЛИНЫ (180 ДНЕЙ • A1+ ➔ B1)
// =========================================================================
async function loadGermanCourseData() {
    const pathContainer = document.getElementById('germanPathContainer');
    if (pathContainer) {
        pathContainer.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs font-bold">🦉 Загрузка дорожки уроков Duolingo...</div>';
    }

    try {
        const res = await fetch('/api/german/course');
        allGermanCourseData = await res.json();
        window.allGermanCourseData = allGermanCourseData;
        
        // Синхронизация прогресса с сервером
        try {
            const progRes = await fetch('/api/german/progress');
            if (progRes.ok) {
                const prog = await progRes.json();
                if (prog.xp) {
                    courseXp = Math.max(courseXp, prog.xp);
                    localStorage.setItem('lingo_xp', courseXp);
                }
                if (prog.streak) {
                    courseStreak = Math.max(courseStreak, prog.streak);
                    localStorage.setItem('lingo_streak', courseStreak);
                }
                if (prog.lesson_id) {
                    currentCourseDay = prog.lesson_id;
                    localStorage.setItem('ai_coach_german_day', currentCourseDay);
                }
            }
        } catch(e) {}

        updateCourseProgressUI();
        renderGermanPlatform();
    } catch (e) {
        if (pathContainer) {
            pathContainer.innerHTML = '<div class="text-center py-10 text-rose-500 text-xs font-bold">Ошибка загрузки курса. Пожалуйста, обновите страницу.</div>';
        }
    }
}

function updateCourseProgressUI() {
    const streakEl = document.getElementById('courseStreakDisplay');
    const xpEl = document.getElementById('courseXpDisplay');
    const heartsEl = document.getElementById('courseHeartsDisplay');

    const streak = parseInt(localStorage.getItem('lingo_streak') || '1', 10);
    const xp = parseInt(localStorage.getItem('lingo_xp') || '0', 10);
    const hearts = parseInt(localStorage.getItem('lingo_hearts') || '5', 10);

    if (streakEl) streakEl.textContent = `${streak} дн.`;
    if (xpEl) xpEl.textContent = `${xp} XP`;
    if (heartsEl) heartsEl.textContent = `${hearts}`;
}

function updateLearnedCountUI() {
    const el = document.getElementById('learnedCount');
    if (el) el.textContent = learnedWords.length;
}

function setGermanLevel(level) {
    currentGermanLevel = (level === 'A1') ? 'A1+' : level;
    window.currentGermanLevel = currentGermanLevel;
    localStorage.setItem('ai_coach_german_level', currentGermanLevel);

    // Перемещаем фокус на первый день выбранного уровня
    if (currentGermanLevel === 'A1+') {
        currentCourseDay = 1;
    } else if (currentGermanLevel === 'A2') {
        currentCourseDay = 31;
    } else if (currentGermanLevel === 'B1') {
        currentCourseDay = 91;
    }
    localStorage.setItem('ai_coach_german_day', currentCourseDay);

    if (window.lingoEngine) {
        window.lingoEngine.currentLessonId = currentCourseDay;
    }

    currentFlashcardLessonId = 'all';
    renderGermanPlatform();
}

function setGermanViewMode(mode) {
    currentGermanMode = mode;
    renderGermanPlatform();
}

function startLingoLesson(lessonId) {
    currentGermanMode = 'quiz';
    renderGermanPlatform();
    if (window.lingoEngine && allGermanCourseData) {
        lingoEngine.startLesson(lessonId, allGermanCourseData.lessons);
    }
}

function startFlashcardsForLesson(lessonId, level) {
    if (level) {
        currentGermanLevel = (level === 'A1') ? 'A1+' : level;
        window.currentGermanLevel = currentGermanLevel;
        localStorage.setItem('ai_coach_german_level', currentGermanLevel);
    }
    currentFlashcardLessonId = String(lessonId);
    currentGermanMode = 'flashcards';
    renderGermanPlatform();
}

// 4-й этап: Живой голосовой Live Voice диалог с немецким речевым коучем
function talkToCoachForLesson(lessonId) {
    startLiveGermanCoach(lessonId);
}

function startLiveGermanCoach(lessonId) {
    currentLiveGermanLessonId = lessonId || 1;
    liveCoachMode = 'german';
    LIVE_SILENCE_DELAY_MS = 4500; // 4.5 секунды тишины: время на размышление без спешки!

    // Закрываем модалки и полноэкранный Duolingo, если были открыты
    const lingoContainer = document.getElementById('lingoAppContainer');
    if (lingoContainer) lingoContainer.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');

    const m1 = document.getElementById('lingoLessonModal');
    if (m1) m1.remove();

    // Переключаем на Live Voice
    switchTab('live');
    updateLiveCoachModeUI();

    // Включаем озвучку ответов коуча, если была выключена
    if (!liveSoundEnabled) {
        toggleLiveSound();
    }

    // Запускаем режим Live, если ещё не активен
    if (!isLiveActive) {
        startLiveVoice();
    }

    const allLessons = window.allGermanCourseData?.lessons || [];
    const lesson = allLessons.find(l => (l.day == lessonId || l.id == lessonId)) || allLessons[0];
    const situation = lesson?.dialogue_simulator?.situation || lesson?.title || 'Практика немецкого языка';

    // Вступительная реплика для начала тренировки
    const prompt = `Hallo! Ich lerne Deutsch und möchte die Situation üben: "${situation}". Bitte stellen Sie mir die erste Frage auf Deutsch mit Übersetzung auf Russisch!`;
    handleLiveUserSpeech(prompt);
}

function switchToCoachLiveMode() {
    liveCoachMode = 'coach';
    LIVE_SILENCE_DELAY_MS = 2500;
    updateLiveCoachModeUI();
    const transcript = document.getElementById('liveTranscript');
    if (transcript) transcript.textContent = 'Здравствуй, дорогая Алина! Я снова рядом в роли твоего психолога и личного коуча. О чём ты думаешь?';
    if (isLiveActive) {
        passTurnToUser();
    }
}

function updateLiveCoachModeUI() {
    const badge = document.getElementById('liveModeBadge');
    const title = document.getElementById('liveTitleText');
    const sub = document.getElementById('liveSubtitleText');
    const switchBtn = document.getElementById('liveSwitchToCoachBtn');

    if (liveCoachMode === 'german') {
        const allLessons = window.allGermanCourseData?.lessons || [];
        const lesson = allLessons.find(l => (l.day == currentLiveGermanLessonId || l.id == currentLiveGermanLessonId)) || allLessons[0];
        const lessonTitle = lesson ? lesson.title : `Урок ${currentLiveGermanLessonId}`;

        if (badge) badge.textContent = `🇩🇪 Немецкий речевой коуч • День ${currentLiveGermanLessonId}`;
        if (title) title.textContent = `Разговорная практика: ${lessonTitle}`;
        if (sub) sub.textContent = `Коуч говорит на немецком с переводом, ждёт ваших ответов (пауза 4.5 сек) и бережно исправляет ошибки.`;
        if (switchBtn) switchBtn.classList.remove('hidden');
    } else {
        if (badge) badge.textContent = 'Google Live Voice • Алина & Коуч';
        if (title) title.textContent = 'Живой разговор';
        if (sub) sub.textContent = 'Коуч слушает ваш голос в реальном времени и отвечает емко, глубоко и бережно';
        if (switchBtn) switchBtn.classList.add('hidden');
    }
}

function renderGermanPlatform() {
    // 1. Обновляем кнопки уровней (A1+ / A2 / B1)
    const activeLevel = currentGermanLevel.startsWith('A1') ? 'a1' : currentGermanLevel.toLowerCase();
    ['a1', 'a2', 'b1'].forEach(l => {
        const btn = document.getElementById('german-btn-' + l);
        if (btn) {
            if (l === activeLevel) {
                btn.className = 'px-2.5 py-1 text-xs font-black rounded-xl bg-emerald-500 text-white shadow-sm transition';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            }
        }
    });

    // 2. Обновляем кнопки переключения режимов
    const btnPath = document.getElementById('german-mode-path');
    const btnCards = document.getElementById('german-mode-flashcards');
    const statEl = document.getElementById('flashcardsStat');

    const pathContainer = document.getElementById('germanPathContainer');
    const lingoContainer = document.getElementById('lingoAppContainer');
    const flashcardsContainer = document.getElementById('germanFlashcardsContainer');

    if (btnPath) {
        btnPath.className = currentGermanMode === 'path'
            ? 'px-3.5 py-1 text-xs font-black rounded-lg bg-white text-emerald-800 shadow-sm transition flex items-center gap-1.5'
            : 'px-3 py-1 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5';
    }

    if (btnCards) {
        btnCards.className = currentGermanMode === 'flashcards'
            ? 'px-3.5 py-1 text-xs font-black rounded-lg bg-white text-emerald-800 shadow-sm transition flex items-center gap-1.5'
            : 'px-3 py-1 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5';
    }

    if (statEl) {
        if (currentGermanMode === 'flashcards') statEl.classList.remove('hidden');
        else statEl.classList.add('hidden');
    }

    if (!allGermanCourseData) return;

    if (currentGermanMode === 'quiz') {
        if (pathContainer) pathContainer.classList.add('hidden');
        if (flashcardsContainer) flashcardsContainer.classList.add('hidden');
        if (lingoContainer) lingoContainer.classList.remove('hidden');
        return;
    }

    if (lingoContainer) lingoContainer.classList.add('hidden');

    if (currentGermanMode === 'path') {
        if (flashcardsContainer) flashcardsContainer.classList.add('hidden');
        if (pathContainer) {
            pathContainer.classList.remove('hidden');
            if (window.lingoEngine) {
                lingoEngine.renderPathView(pathContainer, allGermanCourseData.lessons || []);
            }
        }
    } else {
        // Flashcards
        if (pathContainer) pathContainer.classList.add('hidden');
        if (flashcardsContainer) {
            flashcardsContainer.classList.remove('hidden');
            prepareFlashcards();
            renderFlashcardsView();
        }
    }
}

function prepareFlashcards() {
    if (!allGermanCourseData) return;
    currentFlashcards = [];

    const lessons = allGermanCourseData.lessons || [];
    lessons.forEach(lesson => {
        // Если выбран конкретный урок — фильтруем по ID урока (сравнение строк)
        if (currentFlashcardLessonId !== 'all') {
            if (String(lesson.id) !== String(currentFlashcardLessonId) && String(lesson.day) !== String(currentFlashcardLessonId)) {
                return;
            }
        } else {
            // Если выбран 'all' — берем карточки уроков текущего уровня (A1+, A2, B1)
            if (lesson.level !== currentGermanLevel) return;
        }

        (lesson.vocabulary || []).forEach((v, idx) => {
            currentFlashcards.push({
                id: `${lesson.id}_${idx}_${v.german}`,
                german: v.german,
                transcription: v.transcription || '',
                russian: v.russian,
                example: v.example || '',
                example_translation: v.example_translation || '',
                voice_hint: v.voice_hint || 'de-DE-KatjaNeural',
                lesson_id: lesson.id,
                lesson_title: lesson.title,
                level: lesson.level
            });
        });
    });

    // Защита от пустых карточек: если по фильтру ничего не нашлось, сбрасываем фильтр на 'all' для текущего уровня
    if (currentFlashcards.length === 0 && currentFlashcardLessonId !== 'all') {
        currentFlashcardLessonId = 'all';
        lessons.forEach(lesson => {
            if (lesson.level !== currentGermanLevel) return;
            (lesson.vocabulary || []).forEach((v, idx) => {
                currentFlashcards.push({
                    id: `${lesson.id}_${idx}_${v.german}`,
                    german: v.german,
                    transcription: v.transcription || '',
                    russian: v.russian,
                    example: v.example || '',
                    example_translation: v.example_translation || '',
                    voice_hint: v.voice_hint || 'de-DE-KatjaNeural',
                    lesson_id: lesson.id,
                    lesson_title: lesson.title,
                    level: lesson.level
                });
            });
        });
    }

    if (currentCardIdx >= currentFlashcards.length) {
        currentCardIdx = 0;
    }
    isCardFlipped = false;
}

function renderFlashcardsView() {
    const container = document.getElementById('germanFlashcardsContainer') || document.getElementById('germanContent');
    if (!container) return;
    container.innerHTML = '';

    const lessons = (allGermanCourseData.lessons || []).filter(l => l.level === currentGermanLevel);

    // Панель фильтра уроков
    const filterPanel = document.createElement('div');
    filterPanel.className = 'flex flex-wrap items-center justify-between gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs mb-3';
    
    let lessonOptions = `<option value="all" ${currentFlashcardLessonId === 'all' ? 'selected' : ''}>🌟 Все слова уровня ${currentGermanLevel} (${currentFlashcards.length} шт)</option>`;
    lessons.forEach(l => {
        const count = (l.vocabulary || []).length;
        const isSelected = String(currentFlashcardLessonId) === String(l.id) || String(currentFlashcardLessonId) === String(l.day);
        lessonOptions += `<option value="${l.id}" ${isSelected ? 'selected' : ''}>Урок ${l.day || l.id}: ${escapeHtml(l.title)} (${count} слов)</option>`;
    });

    filterPanel.innerHTML = `
        <div class="flex items-center gap-2 flex-1 min-w-[200px]">
            <span class="font-bold text-slate-700 shrink-0">Выбор урока:</span>
            <select id="flashcardLessonSelect" onchange="onFlashcardLessonChange(this.value)" class="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-rose-400">
                ${lessonOptions}
            </select>
        </div>
        <button onclick="shuffleFlashcards()" class="px-2.5 py-1 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-semibold text-xs transition flex items-center gap-1 shadow-sm">
            🔀 Перемешать
        </button>
    `;
    container.appendChild(filterPanel);

    if (currentFlashcards.length === 0) {
        container.innerHTML += '<div class="text-center py-10 text-slate-400 text-xs">Нет карточек для выбранного фильтра.</div>';
        return;
    }

    const card = currentFlashcards[currentCardIdx];
    const isLearned = learnedWords.includes(card.id);
    const speakerName = card.voice_hint.includes('Conrad') ? 'Conrad 👨' : 'Katja 👩';

    const cardContainer = document.createElement('div');
    cardContainer.className = 'max-w-md mx-auto w-full space-y-4';

    // Верхняя шкала прогресса
    cardContainer.innerHTML = `
        <div class="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Карточка <b class="text-rose-600">${currentCardIdx + 1}</b> из <b>${currentFlashcards.length}</b></span>
            <span>Урок: <b class="text-slate-700">${escapeHtml(card.lesson_title)}</b></span>
        </div>
        <div class="w-full bg-rose-100 rounded-full h-1.5 overflow-hidden">
            <div class="bg-rose-500 h-1.5 rounded-full transition-all duration-300" style="width: ${((currentCardIdx + 1) / currentFlashcards.length) * 100}%"></div>
        </div>
    `;

    // Сама интерактивная карточка
    const flashcardEl = document.createElement('div');
    flashcardEl.className = 'bg-white border-2 border-rose-200 hover:border-rose-300 rounded-2xl p-6 shadow-md min-h-[220px] flex flex-col justify-between cursor-pointer transition-all duration-200 select-none relative group';
    flashcardEl.onclick = (e) => {
        // Если кликнули на кнопку озвучки — не переворачиваем
        if (e.target.closest('button')) return;
        toggleFlashcardFlip();
    };

    if (!isCardFlipped) {
        // ПЕРЕДНЯЯ СТОРОНА КАРТОЧКИ (НЕМЕЦКИЙ)
        flashcardEl.innerHTML = `
            <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">${card.level} • НЕМЕЦКИЙ</span>
                ${isLearned ? '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">✅ Выучено</span>' : '<span class="text-slate-400">Нажмите, чтобы перевернуть</span>'}
            </div>
            <div class="text-center my-4 space-y-2">
                <h3 class="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">${escapeHtml(card.german)}</h3>
                ${card.transcription ? `<p class="text-rose-500 font-mono text-xs sm:text-sm font-semibold">${escapeHtml(card.transcription)}</p>` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-rose-50">
                <button onclick="playTTS(this, '${escapeQuotes(card.german)}', '${card.voice_hint}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 text-xs transition flex items-center gap-1.5 shadow-sm">
                    <span>🔊</span> <span>Озвучить (${speakerName})</span>
                </button>
                <span class="text-[11px] text-rose-400 font-medium">Показать перевод ➔</span>
            </div>
        `;
    } else {
        // ЗАДНЯЯ СТОРОНА КАРТОЧКИ (РУССКИЙ ПЕРЕВОД + ПРИМЕР)
        flashcardEl.innerHTML = `
            <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">${card.level} • ПЕРЕВОД</span>
                ${isLearned ? '<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">✅ Выучено</span>' : '<span class="text-slate-400">Нажмите, чтобы скрыть</span>'}
            </div>
            <div class="text-center my-3 space-y-2">
                <p class="text-xs text-rose-600 font-bold">${escapeHtml(card.german)} ${card.transcription ? `<span class="font-mono font-normal">(${escapeHtml(card.transcription)})</span>` : ''}</p>
                <h3 class="text-xl sm:text-2xl font-extrabold text-emerald-800">${escapeHtml(card.russian)}</h3>
                ${card.example ? `
                    <div class="mt-3 p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-xs text-left">
                        <div class="flex items-center justify-between gap-1">
                            <span class="font-bold text-slate-800">Пример: <i>${escapeHtml(card.example)}</i></span>
                            <button onclick="playTTS(this, '${escapeQuotes(card.example)}', '${card.voice_hint}')" class="text-emerald-700 hover:text-emerald-900 p-0.5" title="Озвучить пример">🔊</button>
                        </div>
                        ${card.example_translation ? `<p class="text-slate-600 text-[11px] mt-0.5">${escapeHtml(card.example_translation)}</p>` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-rose-50">
                <button onclick="playTTS(this, '${escapeQuotes(card.german)}', '${card.voice_hint}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 text-xs transition flex items-center gap-1.5 shadow-sm">
                    <span>🔊</span> <span>${card.german}</span>
                </button>
                <span class="text-[11px] text-emerald-600 font-medium">Вернуть слово ↺</span>
            </div>
        `;
    }

    cardContainer.appendChild(flashcardEl);

    // Панель управления навигацией
    const navPanel = document.createElement('div');
    navPanel.className = 'flex items-center justify-between gap-2 pt-1';
    navPanel.innerHTML = `
        <button onclick="prevFlashcard()" class="flex-1 py-2.5 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-slate-700 font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1 ${currentCardIdx === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
            ⬅️ Назад
        </button>
        <button onclick="toggleFlashcardFlip()" class="flex-1 py-2.5 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1">
            🔄 Перевернуть
        </button>
        <button onclick="nextFlashcard()" class="flex-1 py-2.5 px-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1 ${currentCardIdx === currentFlashcards.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}">
            Вперёд ➡️
        </button>
    `;
    cardContainer.appendChild(navPanel);

    // Кнопка отметки «Выучено»
    const learnBtn = document.createElement('button');
    learnBtn.className = `w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${isLearned ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200'}`;
    learnBtn.innerHTML = isLearned ? '✅ Слово выучено! (Нажмите для отмены)' : '⭐ Отметить как выученное';
    learnBtn.onclick = () => toggleLearnedWord(card.id);
    cardContainer.appendChild(learnBtn);

    container.appendChild(cardContainer);
}

function onFlashcardLessonChange(val) {
    currentFlashcardLessonId = val;
    prepareFlashcards();
    renderFlashcardsView();
}

function toggleFlashcardFlip() {
    isCardFlipped = !isCardFlipped;
    renderFlashcardsView();
}

function nextFlashcard() {
    if (currentCardIdx < currentFlashcards.length - 1) {
        currentCardIdx++;
        isCardFlipped = false;
        renderFlashcardsView();
    }
}

function prevFlashcard() {
    if (currentCardIdx > 0) {
        currentCardIdx--;
        isCardFlipped = false;
        renderFlashcardsView();
    }
}

function shuffleFlashcards() {
    for (let i = currentFlashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentFlashcards[i], currentFlashcards[j]] = [currentFlashcards[j], currentFlashcards[i]];
    }
    currentCardIdx = 0;
    isCardFlipped = false;
    renderFlashcardsView();
}

function toggleLearnedWord(id) {
    const idx = learnedWords.indexOf(id);
    if (idx > -1) {
        learnedWords.splice(idx, 1);
    } else {
        learnedWords.push(id);
    }
    localStorage.setItem('ai_coach_learned_words', JSON.stringify(learnedWords));
    updateLearnedCountUI();
    renderFlashcardsView();
}

function updateMistakesBadgeUI() {
    const badge = document.getElementById('mistakesBadgeCount');
    if (badge && window.lingoEngine) {
        badge.textContent = window.lingoEngine.getMistakesCount();
    }
}

function openMistakesModal() {
    const mistakes = JSON.parse(localStorage.getItem('lingo_mistakes_queue') || '[]');
    const modal = document.createElement('div');
    modal.id = 'lingoMistakesModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';

    if (mistakes.length === 0) {
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center">
                <div class="text-4xl mb-2">🎉</div>
                <h3 class="font-black text-lg text-slate-800">Ошибок нет!</h3>
                <p class="text-xs text-slate-500 mt-1">Алина, вы проходите упражнения невероятно точно. Копилка повторения пуста!</p>
                <button onclick="document.getElementById('lingoMistakesModal').remove()" class="w-full mt-4 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-xs hover:bg-emerald-600 transition">
                    Отлично!
                </button>
            </div>
        `;
    } else {
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-rose-100 flex flex-col max-h-[85vh]">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                        <h3 class="font-black text-base text-slate-800">🎯 Работа над ошибками</h3>
                        <p class="text-[11px] text-slate-500">Слова и фразы, где были допущены неточности (${mistakes.length} шт)</p>
                    </div>
                    <button onclick="document.getElementById('lingoMistakesModal').remove()" class="text-slate-400 hover:text-slate-600 text-base">✕</button>
                </div>
                <div class="flex-1 overflow-y-auto space-y-2 pr-1">
                    ${mistakes.map((m, idx) => `
                        <div class="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex items-center justify-between gap-2">
                            <div>
                                <span class="font-black text-sm text-slate-800 block">${escapeHtml(m.german)}</span>
                                <span class="text-xs text-slate-500">${escapeHtml(m.russian)}</span>
                            </div>
                            <button onclick="playTTS(this, '${escapeQuotes(m.german)}', 'de-DE-KatjaNeural')" class="p-2 bg-white rounded-lg border border-rose-200 text-xs shadow-2xs hover:bg-rose-100 shrink-0">
                                🔊
                            </button>
                        </div>
                    `).join('')}
                </div>
                <div class="pt-3 border-t border-slate-100 mt-3 flex gap-2">
                    <button onclick="localStorage.removeItem('lingo_mistakes_queue'); updateMistakesBadgeUI(); document.getElementById('lingoMistakesModal').remove();" class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition">
                        Очистить список
                    </button>
                    <button onclick="document.getElementById('lingoMistakesModal').remove();" class="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition shadow-sm">
                        Понятно!
                    </button>
                </div>
            </div>
        `;
    }
    document.body.appendChild(modal);
}

// ==========================================
// 7. БИБЛИОТЕКА ПСИХОЛОГИИ
// ==========================================
let allLibraryBooks = [];

async function loadLibraryBooks() {
    try {
        const res = await fetch('/api/library');
        allLibraryBooks = await res.json();
        renderLibrary(allLibraryBooks);
    } catch(e){}
}

function renderLibrary(books) {
    const container = document.getElementById('libraryList');
    if (!container) return;
    container.innerHTML = '';

    books.forEach((b, idx) => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-rose-100 rounded-2xl p-4 space-y-2.5 shadow-sm hover:shadow-md transition flex flex-col justify-between';
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">${escapeHtml(b.category)}</span>
                    <span class="text-[10px] text-slate-500 font-medium">⭐ 4.9 • ${escapeHtml(b.author)}</span>
                </div>
                <h4 class="font-extrabold text-sm text-slate-800 mt-2">${escapeHtml(b.title)}</h4>
                <p class="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">${escapeHtml(b.excerpt)}</p>
                <div class="mt-2.5 p-2.5 bg-gradient-to-r from-rose-50/80 to-pink-50/80 border border-rose-100/80 rounded-xl text-[11px] text-rose-900 leading-snug">
                    <span class="font-bold">💡 Главный инсайт:</span> ${escapeHtml(b.takeaway || (b.key_ideas ? b.key_ideas[0] : ''))}
                </div>
            </div>
            <div class="flex gap-2 pt-1">
                <button onclick="sendMoodPrompt('Алина хочет разобрать психологическую книгу «${escapeQuotes(b.title)}» (${escapeQuotes(b.author)}). Какой ключевой совет из этой книги поможет мне стать спокойнее и увереннее сегодня?')" 
                        class="flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-95 text-white text-xs font-bold rounded-xl transition shadow-sm text-center">
                    💬 Обсудить с коучем
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterLibrary() {
    const q = (document.getElementById('librarySearch')?.value || '').toLowerCase();
    const filtered = allLibraryBooks.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) || 
        b.excerpt.toLowerCase().includes(q)
    );
    renderLibrary(filtered);
}

// ==========================================
// 8. ДОСЬЕ АЛИНЫ
// ==========================================
async function loadDossier() {
    try {
        const res = await fetch('/api/dossier');
        const data = await res.json();
        if (data) {
            const nameEl = document.getElementById('dossierName');
            const notesEl = document.getElementById('dossierNotes');
            if (nameEl && data.name) nameEl.value = data.name;
            if (notesEl && data.notes) notesEl.value = data.notes;
        }
    } catch(e){}
}

async function saveDossierSettings() {
    const name = document.getElementById('dossierName')?.value || 'Алина';
    const notes = document.getElementById('dossierNotes')?.value || '';

    try {
        const res = await fetch('/api/dossier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, notes: notes })
        });
        if (res.ok) {
            alert('Персональное досье Алины успешно обновлено в Supabase!');
        }
    } catch(e) {
        alert('Ошибка сохранения досье.');
    }
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Регистрация Service Worker для PWA (установка на телефон / iPhone)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(reg => console.log('PWA Service Worker registered:', reg.scope))
            .catch(err => console.log('PWA Service Worker registration failed:', err));
    });
}

// Проверка запуска на iOS в режиме браузера (предложение установить на экран «Домой»)
function checkIosInstallPrompt() {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) {
        const iosBanner = document.getElementById('iosInstallBanner');
        if (iosBanner && !localStorage.getItem('ios_pwa_dismissed')) {
            iosBanner.classList.remove('hidden');
        }
    }
}
setTimeout(checkIosInstallPrompt, 1500);