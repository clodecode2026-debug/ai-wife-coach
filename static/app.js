// AI Wife Coach — Frontend App Logic (Алина & Психолог-Коуч)

let currentTab = 'chat';
let sessionId = localStorage.getItem('ai_coach_session_id');
if (!sessionId) {
    sessionId = 'alina_session_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('ai_coach_session_id', sessionId);
}

// Live Voice и Web Audio API
let isLiveActive = false;
let liveRecognition = null;
let audioContext = null;
let analyserNode = null;
let micStream = null;
let animationFrameId = null;
let isAITalking = false;
let currentLiveAudio = null;
let liveSoundEnabled = localStorage.getItem('ai_coach_live_sound') === 'true';
let liveAccumulatedText = '';
let speechSilenceTimer = null;
const LIVE_SILENCE_DELAY_MS = 2500; // 2.5 секунды тишины перед отправкой, чтобы Алина могла подумать и продолжить мысль

// Платформа немецкого языка (уроки и flashcards)
let currentGermanLevel = 'A1';
let currentGermanMode = 'lessons'; // 'lessons' или 'flashcards'
let allGermanCourseData = null;
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
}

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

async function playTTS(btn, text, voice = "ru-RU-SvetlanaNeural") {
    try {
        if (btn) btn.textContent = '⏳';
        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: voice })
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
        if (btn) btn.textContent = '🔊';
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
        stopLiveVoice();
    }
}

async function startLiveVoice() {
    isLiveActive = true;
    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const transcript = document.getElementById('liveTranscript');
    const halo = document.getElementById('liveAvatarHalo');
    const overlay = document.getElementById('liveListeningOverlay');

    statusText.textContent = '🎙️ Слушаю вас, Алина... Говорите свободно!';
    btn.textContent = 'Завершить разговор';
    transcript.textContent = 'Я слушаю ваш голос...';
    if (overlay) overlay.classList.remove('opacity-0');

    // Подключаем Web Audio API для живой реакции на звук
    initAudioVisualizer();

    isAITalking = false;
    startBrowserSpeechRecognition();
}

function stopLiveVoice() {
    isLiveActive = false;
    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const overlay = document.getElementById('liveListeningOverlay');
    const halo = document.getElementById('liveAvatarHalo');
    const pauseIndicator = document.getElementById('livePauseIndicator');

    statusText.textContent = 'Разговор завершен. Нажмите на фото, чтобы продолжить.';
    btn.textContent = 'Начать говорить';
    if (overlay) overlay.classList.add('opacity-0');
    if (halo) halo.style.transform = 'scale(1)';
    if (pauseIndicator) pauseIndicator.classList.add('hidden');

    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    liveAccumulatedText = '';

    stopAudioVisualizer();

    if (liveRecognition) {
        try { liveRecognition.stop(); } catch(e){}
        liveRecognition = null;
    }
    if (currentLiveAudio) {
        try { currentLiveAudio.pause(); } catch(e){}
        currentLiveAudio = null;
    }
}

// Инициализация Web Audio API для динамической визуализации голоса
async function initAudioVisualizer() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(micStream);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 64;
        source.connect(analyserNode);

        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        const bars = document.querySelectorAll('.voice-bar');
        const halo = document.getElementById('liveAvatarHalo');
        const ring = document.getElementById('livePulseRing');

        function updateMeter() {
            if (!isLiveActive) return;
            analyserNode.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(avg / 128, 1.0); // 0.0 to 1.0

            // Анимация эквалайзерных полосок
            bars.forEach((bar, idx) => {
                const val = (dataArray[idx % dataArray.length] || 0) / 255;
                const h = Math.max(4, Math.round(val * 28));
                bar.style.height = `${h}px`;
            });

            // Анимация масштаба и ореола фото
            if (halo && ring) {
                if (normalized > 0.08) {
                    const scale = 1.0 + (normalized * 0.12);
                    halo.style.transform = `scale(${scale})`;
                    ring.style.borderColor = 'rgba(244, 63, 94, 0.9)';
                    ring.style.boxShadow = `0 0 ${20 + normalized * 40}px rgba(244, 63, 94, 0.8)`;
                } else {
                    halo.style.transform = 'scale(1.0)';
                    ring.style.borderColor = 'rgba(244, 63, 94, 0.3)';
                    ring.style.boxShadow = 'none';
                }
            }

            animationFrameId = requestAnimationFrame(updateMeter);
        }

        updateMeter();
    } catch (e) {
        console.warn('Audio Visualizer init notice:', e);
    }
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
    // Сброс высоты полосок
    document.querySelectorAll('.voice-bar').forEach(bar => bar.style.height = '4px');
}

function startBrowserSpeechRecognition() {
    if (!isLiveActive || isAITalking) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        const tr = document.getElementById('liveTranscript');
        if (tr) tr.textContent = 'Распознавание речи не поддерживается данным браузером. Используйте текстовый диалог.';
        return;
    }

    if (liveRecognition) {
        try { liveRecognition.abort(); } catch(e){}
    }

    liveRecognition = new SpeechRecognition();
    liveRecognition.lang = 'ru-RU';
    liveRecognition.continuous = true;
    liveRecognition.interimResults = true;

    liveRecognition.onresult = (event) => {
        let interim = '';
        let newlyFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                newlyFinal += event.results[i][0].transcript + ' ';
            } else {
                interim += event.results[i][0].transcript;
            }
        }

        if (newlyFinal) {
            liveAccumulatedText += newlyFinal;
        }

        const fullSpokenText = (liveAccumulatedText + interim).trim();
        const transcript = document.getElementById('liveTranscript');
        const pauseIndicator = document.getElementById('livePauseIndicator');
        const pauseText = document.getElementById('livePauseText');

        if (fullSpokenText.length > 0) {
            if (transcript) transcript.textContent = `Вы: «${fullSpokenText}»`;
            if (pauseIndicator) pauseIndicator.classList.remove('hidden');
            if (pauseText) pauseText.textContent = `⏳ Слушаю паузу (2.5 сек)... Можете продолжить мысль`;

            // Сбрасываем старый таймер тишины и запускаем новый на 2.5 секунды
            if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
            speechSilenceTimer = setTimeout(() => {
                const textToSend = (liveAccumulatedText + interim).trim();
                if (textToSend.length >= 2 && isLiveActive && !isAITalking) {
                    commitLiveSpeech(textToSend);
                }
            }, LIVE_SILENCE_DELAY_MS);
        }
    };

    liveRecognition.onerror = (e) => {
        if (isLiveActive && !isAITalking && !speechSilenceTimer) {
            setTimeout(() => startBrowserSpeechRecognition(), 600);
        }
    };

    liveRecognition.onend = () => {
        if (isLiveActive && !isAITalking) {
            setTimeout(() => {
                if (isLiveActive && !isAITalking) {
                    try { liveRecognition.start(); } catch(e){}
                }
            }, 300);
        }
    };

    try {
        liveRecognition.start();
    } catch(e){}
}

function commitLiveSpeechImmediately() {
    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    const transcript = document.getElementById('liveTranscript');
    let text = liveAccumulatedText.trim();
    if (!text && transcript) {
        text = transcript.textContent.replace(/^Вы:\s*«?/, '').replace(/»?$/, '').trim();
    }
    if (text && text.length >= 2) {
        commitLiveSpeech(text);
    }
}

function commitLiveSpeech(text) {
    if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
    }
    const pauseIndicator = document.getElementById('livePauseIndicator');
    if (pauseIndicator) pauseIndicator.classList.add('hidden');
    liveAccumulatedText = '';

    if (liveRecognition) {
        try { liveRecognition.stop(); } catch(e){}
    }
    handleLiveUserSpeech(text);
}

async function handleLiveUserSpeech(text) {
    if (!isLiveActive) return;
    isAITalking = true;

    const statusText = document.getElementById('liveStatusText');
    const transcript = document.getElementById('liveTranscript');

    if (statusText) statusText.textContent = '🤔 Анализирую ваш вопрос...';
    if (transcript) transcript.textContent = `Вы: «${text}»`;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, session_id: sessionId, is_voice_mode: true })
        });
        const data = await res.json();
        const reply = data.reply || 'Алина, я рядом и слышу каждое твоё слово.';

        if (transcript) transcript.textContent = reply;

        if (liveSoundEnabled) {
            await playLiveTTS(reply);
        } else {
            // Тихий режим: показываем текст и возобновляем прослушивание
            if (statusText) statusText.textContent = '💬 Ответ готов. Читайте на экране.';
            setTimeout(() => {
                isAITalking = false;
                if (isLiveActive) {
                    if (statusText) statusText.textContent = '🎙️ Слушаю вас, Алина... Говорите!';
                    startBrowserSpeechRecognition();
                }
            }, 2000);
        }
    } catch(e) {
        if (statusText) statusText.textContent = 'Заминка связи. Слушаю снова...';
        isAITalking = false;
        if (isLiveActive) setTimeout(() => startBrowserSpeechRecognition(), 1000);
    }
}

async function playLiveTTS(text) {
    return new Promise(async (resolve) => {
        try {
            const statusText = document.getElementById('liveStatusText');
            if (statusText) statusText.textContent = '🔊 Коуч отвечает... Пожалуйста, слушайте.';

            const res = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, voice: "ru-RU-SvetlanaNeural" })
            });
            if (!res.ok) {
                isAITalking = false;
                if (isLiveActive) startBrowserSpeechRecognition();
                resolve();
                return;
            }
            const blob = await res.blob();
            currentLiveAudio = new Audio(URL.createObjectURL(blob));

            currentLiveAudio.onended = () => {
                isAITalking = false;
                currentLiveAudio = null;
                const statusText = document.getElementById('liveStatusText');
                if (statusText) statusText.textContent = '🎙️ Ваша очередь говорить... Я слушаю!';
                if (isLiveActive) setTimeout(() => startBrowserSpeechRecognition(), 400);
                resolve();
            };

            currentLiveAudio.onerror = () => {
                isAITalking = false;
                currentLiveAudio = null;
                if (isLiveActive) startBrowserSpeechRecognition();
                resolve();
            };

            await currentLiveAudio.play();
        } catch(e) {
            isAITalking = false;
            currentLiveAudio = null;
            if (isLiveActive) startBrowserSpeechRecognition();
            resolve();
        }
    });
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

// ==========================================
// 6. ПЛАТФОРМА ИЗУЧЕНИЯ НЕМЕЦКОГО ЯЗЫКА ДЛЯ АЛИНЫ
// ==========================================
async function loadGermanCourseData() {
    const container = document.getElementById('germanContent');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">Загрузка курса и карточек немецкого языка...</div>';

    try {
        const res = await fetch('/api/german/course');
        allGermanCourseData = await res.json();
        renderGermanPlatform();
    } catch (e) {
        container.innerHTML = '<div class="text-center py-6 text-rose-500 text-xs">Ошибка загрузки немецкого курса. Пожалуйста, обновите страницу.</div>';
    }
}

function updateLearnedCountUI() {
    const el = document.getElementById('learnedCount');
    if (el) el.textContent = learnedWords.length;
}

function setGermanLevel(level) {
    currentGermanLevel = level;
    currentFlashcardLessonId = 'all';
    renderGermanPlatform();
}

function setGermanViewMode(mode) {
    currentGermanMode = mode;
    renderGermanPlatform();
}

function startLingoLesson(lessonId) {
    currentGermanMode = 'duolingo';
    renderGermanPlatform();
    if (window.lingoEngine && allGermanCourseData) {
        lingoEngine.startLesson(lessonId, allGermanCourseData.lessons);
    }
}

function startFlashcardsForLesson(lessonId, level) {
    currentGermanLevel = level;
    currentFlashcardLessonId = lessonId;
    currentGermanMode = 'flashcards';
    renderGermanPlatform();
}

function renderGermanPlatform() {
    // 1. Обновляем кнопки уровней (A1 / A2 / B1)
    ['a1', 'a2', 'b1'].forEach(l => {
        const btn = document.getElementById('german-btn-' + l);
        if (btn) {
            if (l === currentGermanLevel.toLowerCase()) {
                btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500 text-white shadow';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition';
            }
        }
    });

    // 2. Обновляем кнопки переключения режимов
    const btnLessons = document.getElementById('german-mode-lessons');
    const btnCards = document.getElementById('german-mode-flashcards');
    const btnDuolingo = document.getElementById('german-mode-duolingo');
    const statEl = document.getElementById('flashcardsStat');
    const germanContent = document.getElementById('germanContent');
    const lingoContainer = document.getElementById('lingoAppContainer');

    if (btnLessons) {
        btnLessons.className = currentGermanMode === 'lessons'
            ? 'px-3 py-1 text-xs font-bold rounded-lg bg-white text-rose-700 shadow-sm transition'
            : 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-rose-700 transition';
    }

    if (btnCards) {
        btnCards.className = currentGermanMode === 'flashcards'
            ? 'px-3 py-1 text-xs font-bold rounded-lg bg-white text-rose-700 shadow-sm transition'
            : 'px-3 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-rose-700 transition';
    }

    if (btnDuolingo) {
        btnDuolingo.className = currentGermanMode === 'duolingo'
            ? 'px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 text-white shadow-sm transition flex items-center gap-1.5'
            : 'px-3 py-1 text-xs font-bold rounded-lg text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 transition flex items-center gap-1.5 shadow-sm';
    }

    if (statEl) {
        if (currentGermanMode === 'flashcards') statEl.classList.remove('hidden');
        else statEl.classList.add('hidden');
    }

    if (currentGermanMode === 'duolingo') {
        if (germanContent) germanContent.classList.add('hidden');
        if (lingoContainer) {
            lingoContainer.classList.remove('hidden');
            const engine = window.lingoEngine || (typeof lingoEngine !== 'undefined' ? lingoEngine : null);
            if (engine) {
                const lessons = (allGermanCourseData && allGermanCourseData.lessons) ? allGermanCourseData.lessons : [];
                const currentLesson = lessons.find(l => l.level === currentGermanLevel) || lessons[0];
                engine.startLesson(currentLesson ? currentLesson.id : 1, lessons);
            } else {
                lingoContainer.innerHTML = '<div class="text-center p-8 text-rose-500 font-bold text-sm">Загрузка Duolingo... Нажмите кнопку ещё раз через секунду.</div>';
            }
        }
        return;
    }

    if (!allGermanCourseData) return;

    if (lingoContainer) lingoContainer.classList.add('hidden');
    if (germanContent) germanContent.classList.remove('hidden');
    if (currentGermanMode === 'lessons') {
        renderGermanLessons();
    } else {
        prepareFlashcards();
        renderFlashcardsView();
    }
}

function renderGermanLessons() {
    const container = document.getElementById('germanContent');
    if (!container || !allGermanCourseData) return;
    container.innerHTML = '';

    // План обучения
    if (allGermanCourseData.study_plan) {
        const planItem = allGermanCourseData.study_plan.find(p => p.stage.startsWith(currentGermanLevel)) || allGermanCourseData.study_plan[0];
        const planCard = document.createElement('div');
        planCard.className = 'bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/70 rounded-xl p-3.5 shadow-sm text-xs space-y-1 mb-2';
        planCard.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-bold text-amber-900 flex items-center gap-1.5">🎯 ${escapeHtml(planItem.stage)}</span>
                <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[10px]">Срок: ${escapeHtml(planItem.duration)}</span>
            </div>
            <p class="text-slate-600">${escapeHtml(planItem.goal)}</p>
        `;
        container.appendChild(planCard);
    }

    const lessons = (allGermanCourseData.lessons || []).filter(l => l.level === currentGermanLevel);
    if (lessons.length === 0) {
        container.innerHTML += '<p class="text-xs text-slate-500 text-center py-4">Уроков для этого уровня пока нет.</p>';
        return;
    }

    lessons.forEach(lesson => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-rose-100 rounded-xl p-4 space-y-3 shadow-sm';
        
        let vocabHtml = '<div class="space-y-2 mt-2">';
        (lesson.vocabulary || []).forEach(v => {
            const voiceHint = v.voice_hint || 'de-DE-KatjaNeural';
            const speakerName = voiceHint.includes('Conrad') ? 'Conrad 👨' : 'Katja 👩';
            const transcriptionHtml = v.transcription ? `<span class="text-rose-500 font-mono text-[11px] block sm:inline sm:ml-1">${escapeHtml(v.transcription)}</span>` : '';
            const exampleHtml = v.example ? `<div class="text-[11px] text-slate-500 mt-1 pl-1 border-l-2 border-rose-200">Пример: <i>${escapeHtml(v.example)}</i> ${v.example_translation ? `— ${escapeHtml(v.example_translation)}` : ''}</div>` : '';

            vocabHtml += `
                <div class="bg-rose-50/40 p-2.5 rounded-lg border border-rose-100/60 text-xs">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex-1">
                            <span class="font-bold text-rose-900 text-sm">${escapeHtml(v.german)}</span>
                            ${transcriptionHtml}
                            <span class="text-slate-700 block sm:inline sm:ml-2 font-medium">(${escapeHtml(v.russian)})</span>
                        </div>
                        <button onclick="playTTS(this, '${escapeQuotes(v.german)}', '${voiceHint}')" class="px-2.5 py-1.5 bg-white text-rose-700 font-semibold rounded-lg shadow-sm border border-rose-200 hover:bg-rose-100 transition shrink-0 flex items-center gap-1 text-[11px]" title="Озвучить диктором">
                            <span>🔊</span> <span>${speakerName}</span>
                        </button>
                    </div>
                    ${exampleHtml}
                </div>
            `;
        });
        vocabHtml += '</div>';

        let dialogueHtml = '';
        if (lesson.dialogue_simulator) {
            dialogueHtml = `
                <div class="mt-3 bg-purple-50/60 border border-purple-100 rounded-lg p-3 text-xs space-y-1">
                    <div class="font-bold text-purple-900 flex items-center gap-1">💬 Тренажер диалога: ${escapeHtml(lesson.dialogue_simulator.situation)}</div>
                    <div class="text-purple-700 italic">Пример: «${escapeHtml(lesson.dialogue_simulator.example)}»</div>
                    <div class="text-slate-500 text-[11px]">💡 Подсказка: ${escapeHtml(lesson.dialogue_simulator.tips)}</div>
                </div>
            `;
        }

        const vocabCount = (lesson.vocabulary || []).length;

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold">${lesson.level}</span>
                        <h3 class="font-bold text-sm sm:text-base text-slate-800">${escapeHtml(lesson.title)}</h3>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button onclick="startLingoLesson(${lesson.id})" class="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white border-b-2 border-emerald-600 active:border-b-0 rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 shadow-sm" title="Пройти урок в Duolingo">
                            <img src="/static/duolingo/mascot.svg" class="w-3.5 h-3.5" alt="Owl">
                            🎮 Duolingo
                        </button>
                        <button onclick="startFlashcardsForLesson('${lesson.id}', '${lesson.level}')" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
                            📇 Карточки (${vocabCount})
                        </button>
                    </div>
                </div>
                <p class="text-xs text-rose-700 font-medium mt-1.5 bg-rose-50/70 p-2 rounded-lg border border-rose-100">📖 Грамматика: ${escapeHtml(lesson.grammar)}</p>
                ${lesson.rule_explanation ? `<p class="text-[11px] text-slate-600 mt-1 italic pl-1">💡 ${escapeHtml(lesson.rule_explanation)}</p>` : ''}
            </div>
            ${vocabHtml}
            ${dialogueHtml}
        `;
        container.appendChild(card);
    });
}

function prepareFlashcards() {
    if (!allGermanCourseData) return;
    currentFlashcards = [];

    const lessons = allGermanCourseData.lessons || [];
    lessons.forEach(lesson => {
        if (lesson.level !== currentGermanLevel) return;
        if (currentFlashcardLessonId !== 'all' && lesson.id !== currentFlashcardLessonId) return;

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

    currentCardIdx = 0;
    isCardFlipped = false;
}

function renderFlashcardsView() {
    const container = document.getElementById('germanContent');
    if (!container) return;
    container.innerHTML = '';

    const lessons = (allGermanCourseData.lessons || []).filter(l => l.level === currentGermanLevel);

    // Панель фильтра уроков
    const filterPanel = document.createElement('div');
    filterPanel.className = 'flex flex-wrap items-center justify-between gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs mb-3';
    
    let lessonOptions = `<option value="all" ${currentFlashcardLessonId === 'all' ? 'selected' : ''}>🌟 Все слова уровня ${currentGermanLevel} (${currentFlashcards.length} шт)</option>`;
    lessons.forEach(l => {
        const count = (l.vocabulary || []).length;
        lessonOptions += `<option value="${l.id}" ${currentFlashcardLessonId === l.id ? 'selected' : ''}>Урок ${l.id}: ${escapeHtml(l.title)} (${count} слов)</option>`;
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

    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-rose-100 rounded-xl p-3.5 space-y-2 shadow-sm flex flex-col justify-between';
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-rose-600 uppercase tracking-wider">${escapeHtml(b.category)}</span>
                    <span class="text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded">${escapeHtml(b.author)}</span>
                </div>
                <h4 class="font-bold text-xs sm:text-sm text-slate-800 mt-1">${escapeHtml(b.title)}</h4>
                <p class="text-[11px] text-slate-600 mt-1">${escapeHtml(b.excerpt)}</p>
                <div class="mt-2 p-2 bg-rose-50/50 rounded-lg text-[10px] text-rose-900 italic">
                    💡 Ключевая мысль: ${escapeHtml(b.takeaway)}
                </div>
            </div>
            <button onclick="sendMoodPrompt('Расскажи подробнее про книгу «${escapeQuotes(b.title)}» ${escapeQuotes(b.author)} и как применить её совет в моей жизни?')" class="w-full mt-2 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg transition">
                Обсудить с коучем
            </button>
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