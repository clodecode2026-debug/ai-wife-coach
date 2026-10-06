// Основной логический файл фронтенда AI Wife Coach

let currentSessionId = 'session_' + Math.random().toString(36).substring(2, 9);
let isLiveVoiceActive = false;
let recognition = null;
let isMuted = false;
let currentVoiceModel = "ru-RU-SvetlanaNeural";

// Переключение вкладок
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');

    // Кнопки навигации
    ['chat', 'german', 'library', 'tasks'].forEach(t => {
        const btn = document.getElementById('tab-btn-' + t);
        if (t === tabId) {
            btn.className = "px-3 py-1.5 text-xs md:text-sm font-semibold rounded-lg bg-white text-rose-600 shadow-sm transition";
        } else {
            btn.className = "px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg text-slate-600 hover:text-rose-600 transition";
        }
    });

    if (tabId === 'german') loadGermanPhrases();
    if (tabId === 'library') loadLibrary();
    if (tabId === 'tasks') loadTasks();
}

// Отправка текстового сообщения
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';

    const loadingId = appendMessage('ai', 'Солнышко думает и подбирает самые теплые слова...', true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: text, session_id: currentSessionId, is_voice_mode: false })
        });
        const data = await response.json();
        
        removeMessage(loadingId);
        if (data.reply) {
            appendMessage('ai', data.reply);
            playTTS(data.reply);
        } else {
            appendMessage('ai', 'Я рядом, солнышко, но не смогла ответить. Попробуй еще раз.');
        }
    } catch (e) {
        removeMessage(loadingId);
        appendMessage('ai', 'Произошла ошибка связи с сервером. Но я всё равно рядом с тобой!');
    }
}

function appendMessage(role, text, isLoading = false) {
    const chat = document.getElementById('chatMessages');
    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    
    const div = document.createElement('div');
    div.id = msgId;
    div.className = `flex items-start gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`;
    
    const avatar = document.createElement('div');
    avatar.className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow ${role === 'user' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`;
    avatar.innerText = role === 'user' ? 'Я' : 'AI';

    const bubble = document.createElement('div');
    bubble.className = `rounded-2xl p-4 max-w-xl text-slate-700 shadow-sm ${role === 'user' ? 'bg-amber-50 border border-amber-100 text-right' : 'bg-rose-50 border border-rose-100'}`;
    if (isLoading) {
        bubble.classList.add('animate-pulse', 'italic');
    }
    bubble.innerText = text;

    div.appendChild(avatar);
    div.appendChild(bubble);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    return msgId;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Озвучка (TTS)
async function playTTS(text, voice = "ru-RU-SvetlanaNeural") {
    try {
        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: text, voice: voice })
        });
        if (res.ok) {
            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.play();
            return audio;
        }
    } catch (e) {
        console.error("TTS playback error:", e);
    }
    return null;
}

// МОДАЛЬНОЕ ОКНО 'GOOGLE LIVE' ДЛЯ ПОЛНОРАЗМЕРНОГО ГОЛОСОВОГО ДИАЛОГА
let liveRecognition = null;
let livePaused = false;

function openGoogleLiveModal() {
    let modal = document.getElementById('googleLiveModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'googleLiveModal';
        modal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-pink-100 flex flex-col items-center text-center relative overflow-hidden">
                <button onclick="closeGoogleLiveModal()" class="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <h3 class="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1">Google Live Voice Mode</h3>
                <p class="text-xs text-slate-500 mb-6">Полноразмерный голосовой диалог с ИИ-коучем</p>

                <!-- Пульсирующая сфера визуализации -->
                <div class="relative w-40 h-40 flex items-center justify-center my-6">
                    <div class="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 opacity-30 animate-ping"></div>
                    <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 opacity-50 animate-pulse"></div>
                    <div id="liveOrb" class="relative w-28 h-28 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-pink-300">
                        <svg class="w-12 h-12 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    </div>
                </div>

                <!-- Переключение голоса -->
                <div class="flex items-center gap-2 mb-6 bg-rose-50 p-1.5 rounded-xl border border-rose-100">
                    <button onclick="setLiveVoice('ru-RU-SvetlanaNeural')" id="voiceBtnSvetlana" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-rose-600 shadow-sm transition">🇷🇺 Светлана</button>
                    <button onclick="setLiveVoice('de-DE-KatjaNeural')" id="voiceBtnKatja" class="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-rose-600 transition">🇩🇪 Katja (Немецкий)</button>
                </div>

                <!-- Статус диалога -->
                <p id="liveStatusText" class="text-sm font-medium text-slate-600 mb-6 h-12 flex items-center justify-center">Слушаю вас... Говорите в микрофон.</p>

                <!-- Кнопки управления -->
                <div class="flex items-center gap-4 w-full">
                    <button onclick="toggleLivePause()" id="livePauseBtn" class="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-2">
                        <span>⏸ Пауза</span>
                    </button>
                    <button onclick="closeGoogleLiveModal()" class="flex-1 py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2">
                        <span>⏹ Завершить</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.classList.remove('hidden');
    }

    startLiveSpeechRecognition();
}

function closeGoogleLiveModal() {
    const modal = document.getElementById('googleLiveModal');
    if (modal) modal.classList.add('hidden');
    if (liveRecognition) {
        try { liveRecognition.stop(); } catch(e) {}
    }
}

function setLiveVoice(voiceName) {
    currentVoiceModel = voiceName;
    if (voiceName.includes('Katja')) {
        document.getElementById('voiceBtnKatja').className = "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-rose-600 shadow-sm transition";
        document.getElementById('voiceBtnSvetlana').className = "px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-rose-600 transition";
    } else {
        document.getElementById('voiceBtnSvetlana').className = "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-rose-600 shadow-sm transition";
        document.getElementById('voiceBtnKatja').className = "px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-rose-600 transition";
    }
}

function toggleLivePause() {
    livePaused = !livePaused;
    const btn = document.getElementById('livePauseBtn');
    const status = document.getElementById('liveStatusText');
    if (livePaused) {
        btn.innerHTML = '▶️ Продолжить';
        status.innerText = 'Диалог на паузе...';
        if (liveRecognition) liveRecognition.stop();
    } else {
        btn.innerHTML = '⏸ Пауза';
        status.innerText = 'Слушаю вас... Говорите в микрофон.';
        startLiveSpeechRecognition();
    }
}

function startLiveSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('liveStatusText').innerText = 'Голосовой ввод не поддерживается вашим браузером. Используйте текст.';
        return;
    }

    liveRecognition = new SpeechRecognition();
    liveRecognition.lang = currentVoiceModel.includes('de-DE') ? 'de-DE' : 'ru-RU';
    liveRecognition.interimResults = false;
    liveRecognition.maxAlternatives = 1;

    liveRecognition.onresult = async function(event) {
        if (livePaused) return;
        const speechResult = event.results[0][0].transcript;
        document.getElementById('liveStatusText').innerText = `Вы: "${speechResult}"`;
        
        // Отправляем в чат в режиме voice_mode=true (короткие ответы)
        try {
            document.getElementById('liveStatusText').innerText = 'Коуч думает (краткий ответ)...';
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ message: speechResult, session_id: currentSessionId, is_voice_mode: true })
            });
            const data = await res.json();
            if (data.reply) {
                document.getElementById('liveStatusText').innerText = `Коуч: "${data.reply}"`;
                // Дублируем и в обычный чат
                appendMessage('user', speechResult);
                appendMessage('ai', data.reply);
                
                // Озвучиваем короткий ответ
                const audio = await playTTS(data.reply, currentVoiceModel);
                if (audio) {
                    audio.onended = () => {
                        if (!livePaused && document.getElementById('googleLiveModal') && !document.getElementById('googleLiveModal').classList.contains('hidden')) {
                            document.getElementById('liveStatusText').innerText = 'Слушаю вас... Говорите в микрофон.';
                            try { liveRecognition.start(); } catch(e) {}
                        }
                    };
                }
            }
        } catch (e) {
            console.error("Live voice error:", e);
        }
    };

    liveRecognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
    };

    liveRecognition.onend = function() {
        if (!livePaused && document.getElementById('googleLiveModal') && !document.getElementById('googleLiveModal').classList.contains('hidden')) {
            try { liveRecognition.start(); } catch(e) {}
        }
    };

    try {
        liveRecognition.start();
    } catch(e) {
        console.error("Failed to start recognition:", e);
    }
}

// Обычный голосовой ввод
function toggleRecordVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Голосовой ввод не поддерживается вашим браузером");
        return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.onresult = (e) => {
        document.getElementById('chatInput').value = e.results[0][0].transcript;
        sendMessage();
    };
    rec.start();
}

// Немецкий язык
async function loadGermanPhrases(level = 'ALL') {
    try {
        const res = await fetch(`/api/german?level=${level}`);
        const phrases = await res.json();
        const container = document.getElementById('germanList');
        container.innerHTML = '';
        phrases.forEach(p => {
            const card = document.createElement('div');
            card.className = "bg-white border border-rose-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-700">${p.level}</span>
                        <span class="text-xs text-slate-400">${p.category}</span>
                    </div>
                    <h3 class="font-bold text-base text-slate-800 mb-1">${p.german}</h3>
                    <p class="text-sm text-slate-600 mb-2">${p.russian}</p>
                    <p class="text-xs text-slate-500 italic bg-rose-50/50 p-2 rounded-lg">${p.grammar}</p>
                </div>
                <button onclick="playTTS('${p.german}', 'de-DE-KatjaNeural')" class="mt-3 w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1">
                    <span>🔊 Прослушать (Katja)</span>
                </button>
            `;
            container.appendChild(card);
        });
    } catch(e) {
        console.error("Error loading german:", e);
    }
}

function filterGerman(level) {
    loadGermanPhrases(level);
}

// Библиотека
async function loadLibrary(query = '') {
    try {
        const url = query ? `/api/library?q=${encodeURIComponent(query)}` : '/api/library';
        const res = await fetch(url);
        const items = await res.json();
        const container = document.getElementById('libraryList');
        container.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">${item.author}</span>
                    </div>
                    <h3 class="font-bold text-base text-slate-800 mb-2">${item.title}</h3>
                    <blockquote class="text-sm text-slate-600 italic bg-rose-50/30 p-3 rounded-xl border-l-4 border-rose-400 mb-3">"${item.excerpt}"</blockquote>
                </div>
                <button onclick="playTTS('${item.excerpt}')" class="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1">
                    <span>🔊 Озвучить цитату</span>
                </button>
            `;
            container.appendChild(card);
        });
    } catch(e) {
        console.error("Error loading library:", e);
    }
}

function searchLibrary() {
    const q = document.getElementById('librarySearch').value;
    loadLibrary(q);
}

// Задачи
let localTasks = [
    { id: 1, text: "Уделить 15 минут утренней медитации и дыханию", completed: true },
    { id: 2, text: "Выпить чашечку любимого чая без спешки и гаджетов", completed: false },
    { id: 3, text: "Повторить 5 немецких фраз с коучем Katja", completed: false },
    { id: 4, text: "Записать вечернюю благодарность себе за этот день", completed: false }
];

function loadTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';
    localTasks.forEach(t => {
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-4 rounded-2xl border transition ${t.completed ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' : 'bg-white border-rose-100 shadow-sm text-slate-700'}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id})" class="w-5 h-5 accent-rose-500 rounded cursor-pointer">
                <span class="text-sm font-medium">${t.text}</span>
            </div>
            <button onclick="deleteTask(${t.id})" class="text-slate-400 hover:text-rose-600 transition text-sm">Удалить</button>
        `;
        container.appendChild(div);
    });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) return;
    localTasks.push({ id: Date.now(), text: text, completed: false });
    input.value = '';
    loadTasks();
}

function toggleTask(id) {
    const task = localTasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
    loadTasks();
}

function deleteTask(id) {
    localTasks = localTasks.filter(t => t.id !== id);
    loadTasks();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Автозагрузка задач или чего-либо при желании
});
