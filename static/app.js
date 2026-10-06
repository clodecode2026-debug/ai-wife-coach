// Основной логический файл фронтенда AI Wife Coach

let currentSessionId = 'session_' + Math.random().toString(36).substring(2, 9);
let isLiveVoiceActive = false;
let recognition = null;
let isMuted = false;

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
            body: JSON.stringify({ message: text, session_id: currentSessionId })
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
async function playTTS(text) {
    try {
        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: text })
        });
        if (res.ok) {
            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.play();
        }
    } catch (e) {
        console.error("TTS playback error:", e);
    }
}

// ЖИВОЙ ГОЛОСОВОЙ ДИАЛОГ (Live Voice Mode)
function startLiveVoiceConversation() {
    const modal = document.getElementById('liveVoiceModal');
    modal.classList.remove('hidden');
    isLiveVoiceActive = true;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Ваш браузер не поддерживает распознавание речи. Используйте Chrome.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onresult = async function(event) {
        if (isMuted || !isLiveVoiceActive) return;
        const transcript = event.results[event.results.length - 1][0].transcript;
        document.getElementById('liveStatusText').innerText = `Вы сказали: "${transcript}"`;
        
        // Отправляем в чат
        appendMessage('user', transcript);
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ message: transcript, session_id: currentSessionId })
            });
            const data = await response.json();
            if (data.reply) {
                appendMessage('ai', data.reply);
                document.getElementById('liveStatusText').innerText = `Коуч отвечает голосом...`;
                await playTTSAsync(data.reply);
                document.getElementById('liveStatusText').innerText = `Слушаю вас... Говорите.`;
            }
        } catch (e) {
            console.error(e);
        }
    };

    recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
    };

    recognition.onend = function() {
        if (isLiveVoiceActive && !isMuted) {
            try { recognition.start(); } catch(e){}
        }
    };

    try {
        recognition.start();
        document.getElementById('liveStatusText').innerText = "Микрофон активен. Говорите...";
    } catch(e) {
        console.error(e);
    }
}

function playTTSAsync(text) {
    return new Promise(async (resolve) => {
        try {
            const res = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ text: text })
            });
            if (res.ok) {
                const blob = await res.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                audio.onended = resolve;
                audio.onerror = resolve;
                audio.play();
            } else {
                resolve();
            }
        } catch(e) {
            resolve();
        }
    });
}

function stopLiveVoice() {
    isLiveVoiceActive = false;
    if (recognition) {
        try { recognition.stop(); } catch(e){}
    }
    document.getElementById('liveVoiceModal').classList.add('hidden');
}

function toggleVoiceMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('muteVoiceBtn');
    const status = document.getElementById('liveStatusText');
    if (isMuted) {
        btn.innerText = "Включить микрофон";
        status.innerText = "Микрофон на паузе.";
    } else {
        btn.innerText = "Пауза микрофона";
        status.innerText = "Слушаю вас... Говорите.";
    }
}

// Загрузка немецких фраз
async function loadGermanPhrases(level = 'ALL') {
    const list = document.getElementById('germanList');
    list.innerHTML = '<p class="text-slate-400 col-span-3 text-center py-8">Загрузка фраз...</p>';
    
    try {
        const res = await fetch(`/api/german?level=${level}`);
        const phrases = await res.json();
        
        list.innerHTML = '';
        phrases.forEach(p => {
            const card = document.createElement('div');
            card.className = "bg-rose-50/50 border border-rose-100 p-4 rounded-xl shadow-sm flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-bold px-2 py-0.5 bg-rose-200 text-rose-800 rounded">${p.level}</span>
                        <span class="text-xs text-slate-500">${p.category}</span>
                    </div>
                    <p class="font-bold text-rose-900 text-base mb-1">🇩🇪 ${p.german}</p>
                    <p class="text-sm text-slate-600 mb-2">🇷🇺 ${p.russian}</p>
                    <p class="text-xs text-slate-500 italic bg-white p-2 rounded border border-rose-100">${p.grammar}</p>
                </div>
                <button onclick="playTTS('${p.german}')" class="mt-3 text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 py-1.5 px-3 rounded-lg font-semibold transition self-start">🔊 Озвучить</button>
            `;
            list.appendChild(card);
        });
    } catch(e) {
        list.innerHTML = '<p class="text-red-400 col-span-3 text-center">Не удалось загрузить фразы</p>';
    }
}

function filterGerman(level) {
    loadGermanPhrases(level);
}

// Загрузка библиотеки
async function loadLibrary() {
    const list = document.getElementById('libraryList');
    list.innerHTML = '<p class="text-slate-400 col-span-2 text-center py-8">Загрузка библиотеки...</p>';
    
    try {
        const res = await fetch('/api/library');
        const items = await res.json();
        
        list.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-rose-50/50 border border-rose-100 p-5 rounded-2xl shadow-sm flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-semibold px-2.5 py-1 bg-pink-100 text-pink-800 rounded-full">${item.category}</span>
                        <span class="text-xs font-bold text-slate-600">${item.author}</span>
                    </div>
                    <h3 class="font-bold text-slate-800 text-base mb-2">${item.title}</h3>
                    <p class="text-sm text-slate-700 italic bg-white p-3 rounded-xl border border-rose-100 mb-3">${item.excerpt}</p>
                </div>
                <button onclick="playTTS('${item.excerpt}')" class="text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 py-1.5 px-3 rounded-lg font-semibold transition self-start">🔊 Озвучить цитату</button>
            `;
            list.appendChild(card);
        });
    } catch(e) {
        list.innerHTML = '<p class="text-red-400 col-span-2 text-center">Не удалось загрузить библиотеку</p>';
    }
}

// Задачи
let localTasks = [
    { id: 1, title: "Выпить чашку ароматного чая в тишине", completed: true },
    { id: 2, title: "Пройти 1 урок немецкого языка (уровень A2)", completed: false },
    { id: 3, title: "Прочитать главу из книги Ирвима Ялома", completed: false },
    { id: 4, title: "Уделить 15 минут дыхательным практикам", completed: false }
];

function loadTasks() {
    const list = document.getElementById('tasksList');
    list.innerHTML = '';
    
    localTasks.forEach(t => {
        const div = document.createElement('div');
        div.className = `flex items-center justify-between p-4 rounded-xl border ${t.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-rose-100'} shadow-sm`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id})" class="w-5 h-5 accent-rose-500 rounded">
                <span class="${t.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}">${t.title}</span>
            </div>
            <span class="text-xs ${t.completed ? 'text-emerald-600 font-semibold' : 'text-rose-500'}">${t.completed ? 'Выполнено ✨' : 'В процессе'}</span>
        `;
        list.appendChild(div);
    });
}

function toggleTask(id) {
    const task = localTasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        loadTasks();
    }
}

function addTaskModal() {
    const title = prompt("Введите новую цель или задачу для заботы о себе:");
    if (title && title.trim()) {
        localTasks.push({ id: Date.now(), title: title.trim(), completed: false });
        loadTasks();
    }
}

// Голосовой ввод кнопкой мика
function toggleRecordVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Голосовой ввод не поддерживается вашим браузером");
        return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    rec.onresult = function(e) {
        document.getElementById('chatInput').value = e.results[0][0].transcript;
    };
    rec.start();
}
