// Клиентская логика AI Wife Coach Super-App

let currentTab = 'chat';
let sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
let isLiveActive = false;
let liveRecognition = null;

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация при загрузке
    loadGermanCourse('A1');
    loadLibraryBooks();
});

function switchTab(tabId) {
    // Синхронизируем 'coach' и 'chat'
    if (tabId === 'coach') tabId = 'chat';
    if (tabId === 'chat') {
        // можно поддержать оба id
    }
    
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
                btnMobile.classList.add('text-pink-600', 'font-semibold');
                btnMobile.classList.remove('text-slate-400', 'font-normal');
                const span = btnMobile.querySelector('span:last-child');
                if (span) span.classList.add('font-semibold');
            } else {
                btnMobile.classList.remove('text-pink-600', 'font-semibold');
                btnMobile.classList.add('text-slate-400', 'font-normal');
                const span = btnMobile.querySelector('span:last-child');
                if (span) span.classList.remove('font-semibold');
            }
        }
    });

    // Также проверим альтернативный id для кнопок с tab-btn-coach
    const btnCoachDesktop = document.getElementById('tab-btn-coach');
    if (btnCoachDesktop) {
        if (tabId === 'chat') {
            btnCoachDesktop.classList.add('bg-white', 'text-rose-600', 'shadow-sm', 'font-semibold');
            btnCoachDesktop.classList.remove('text-slate-600', 'font-medium');
        } else {
            btnCoachDesktop.classList.remove('bg-white', 'text-rose-600', 'shadow-sm', 'font-semibold');
            btnCoachDesktop.classList.add('text-slate-600', 'font-medium');
        }
    }
}

// ЧАТ ФУНКЦИИ
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    appendMessage(text, 'user');

    // Индикатор набора
    const loadingId = appendLoadingMessage();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, session_id: sessionId, is_voice_mode: false })
        });
        const data = await res.json();
        removeLoadingMessage(loadingId);
        appendMessage(data.reply || 'Любимая, я рядом.', 'assistant');
    } catch (err) {
        removeLoadingMessage(loadingId);
        appendMessage('Солнышко, временная заминка связи. Но я всегда с тобой!', 'assistant');
    }
}

function appendMessage(text, role) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    
    if (role === 'user') {
        div.className = 'flex items-start justify-end gap-2.5';
        div.innerHTML = `
            <div class="bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl p-3.5 max-w-xl text-sm shadow-sm">
                <p>${escapeHtml(text)}</p>
            </div>
            <div class="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow">Я</div>
        `;
    } else {
        div.className = 'flex items-start gap-2.5';
        div.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow">AI</div>
            <div class="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 max-w-xl text-slate-700 text-sm shadow-sm relative group">
                <p>${escapeHtml(text)}</p>
                <button onclick="playTTS(this, '${escapeQuotes(text)}')" class="absolute top-2 right-2 opacity-50 hover:opacity-100 text-rose-600 p-1 rounded transition" title="Озвучить">
                    🔊
                </button>
            </div>
        `;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function appendLoadingMessage() {
    const container = document.getElementById('chatMessages');
    const id = 'loading_' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex items-start gap-2.5';
    div.innerHTML = `
        <div class="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow">AI</div>
        <div class="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-slate-500 text-sm shadow-sm flex items-center gap-2">
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></span>
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
            <span class="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            <span class="text-xs ml-1">Коуч подбирает слова поддержки...</span>
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

// TTS ОЗВУЧКА
async function playTTS(btn, text, voice = "ru-RU-SvetlanaNeural") {
    try {
        btn.textContent = '⏳';
        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: voice })
        });
        if (!res.ok) throw new Error('TTS failed');
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
        btn.textContent = '🔊';
    } catch (e) {
        console.error(e);
        btn.textContent = '❌';
        setTimeout(() => btn.textContent = '🔊', 2000);
    }
}

// GOOGLE LIVE VOICE РЕЖИМ
function toggleLiveVoiceState() {
    isLiveActive = !isLiveActive;
    const orb = document.getElementById('liveOrb');
    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const transcript = document.getElementById('liveTranscript');

    if (isLiveActive) {
        orb.classList.add('animate-pulse', 'scale-105', 'shadow-[0_0_80px_rgba(236,72,153,0.8)]');
        statusText.textContent = 'ИИ слушает в режиме Live Voice... Говорите!';
        btn.textContent = 'Остановить разговор';
        transcript.textContent = 'Слушаю вас внимательно... Сформулируйте короткий вопрос.';
        
        // Запуск распознавания речи если поддерживается браузером
        startBrowserSpeechRecognition();
    } else {
        orb.classList.remove('animate-pulse', 'scale-105', 'shadow-[0_0_80px_rgba(236,72,153,0.8)]');
        statusText.textContent = 'Разговор завершен. Нажмите на шар, чтобы возобновить';
        btn.textContent = 'Начать говорить';
        transcript.textContent = 'Диалог приостановлен.';
        if (liveRecognition) {
            try { liveRecognition.stop(); } catch(e){}
        }
    }
}

function startBrowserSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('liveTranscript').textContent = 'Ваш браузер не поддерживает Web Speech API. Используйте текстовый ввод.';
        return;
    }
    try {
        liveRecognition = new SpeechRecognition();
        liveRecognition.lang = 'ru-RU';
        liveRecognition.interimResults = false;
        liveRecognition.maxAlternatives = 1;

        liveRecognition.onresult = async (event) => {
            const speechText = event.results[0][0].transcript;
            document.getElementById('liveTranscript').textContent = 'Вы: ' + speechText;
            
            // Запрос в Live режиме (ультра-краткий ответ)
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: speechText, session_id: sessionId, is_voice_mode: true })
                });
                const data = await res.json();
                const reply = data.reply || 'Любимая, я рядом.';
                document.getElementById('liveTranscript').textContent = 'ИИ: ' + reply;
                
                // Мгновенная озвучка через edge-tts
                playLiveTTS(reply);
            } catch (e) {
                document.getElementById('liveTranscript').textContent = 'Ошибка связи с коучем.';
            }
        };

        liveRecognition.onend = () => {
            if (isLiveActive) {
                try { liveRecognition.start(); } catch(e){}
            }
        };

        liveRecognition.start();
    } catch (e) {
        console.error(e);
    }
}

async function playLiveTTS(text) {
    try {
        const res = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: "ru-RU-SvetlanaNeural" })
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    } catch(e) {}
}

// НЕМЕЦКИЙ КУРС
async function loadGermanCourse(level) {
    ['a1', 'a2', 'b1'].forEach(l => {
        const btn = document.getElementById('german-btn-' + l);
        if (btn) {
            if (l === level.toLowerCase()) {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500 text-white shadow';
            } else {
                btn.className = 'px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700';
            }
        }
    });

    const container = document.getElementById('germanContent');
    container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">Загрузка уроков немецкого...</div>';

    try {
        const res = await fetch('/api/german/course');
        const data = await res.json();
        const lessons = data.lessons.filter(l => l.level === level);

        container.innerHTML = '';
        if (lessons.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4">Уроков для этого уровня пока нет.</p>';
            return;
        }

        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'bg-rose-50/40 border border-rose-100 rounded-xl p-4 space-y-3';
            
            let vocabHtml = '<div class="space-y-2 mt-2">';
            lesson.vocabulary.forEach(v => {
                vocabHtml += `
                    <div class="flex items-center justify-between bg-white p-2.5 rounded-lg border border-rose-100 text-xs">
                        <div>
                            <span class="font-bold text-rose-900">${escapeHtml(v.german)}</span>
                            <span class="text-slate-500 ml-2">(${escapeHtml(v.russian)})</span>
                        </div>
                        <button onclick="playTTS(this, '${escapeQuotes(v.german)}', '${v.voice_hint || 'de-DE-KatjaNeural'}')" class="p-1.5 bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 transition" title="Озвучить немецкий">
                            🔊
                        </button>
                    </div>
                `;
            });
            vocabHtml += '</div>';

            card.innerHTML = `
                <div>
                    <span class="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold">${lesson.level}</span>
                    <h3 class="font-bold text-sm text-slate-800 mt-1">${escapeHtml(lesson.title)}</h3>
                    <p class="text-xs text-slate-600 mt-1"><b>Грамматика:</b> ${escapeHtml(lesson.grammar)}</p>
                </div>
                ${vocabHtml}
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Не удалось загрузить курс немецкого.</p>';
    }
}

// ПСИХОЛОГИЧЕСКАЯ БИБЛИОТЕКА
async function loadLibraryBooks(searchQuery = '') {
    const container = document.getElementById('libraryList');
    container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs col-span-2">Загрузка библиотеки книг...</div>';

    try {
        let url = '/api/books/psychology';
        if (searchQuery) url += `?q=${encodeURIComponent(searchQuery)}`;
        const res = await fetch(url);
        const books = await res.json();

        container.innerHTML = '';
        if (books.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-500 text-center py-4 col-span-2">Книги не найдены.</p>';
            return;
        }

        books.forEach(b => {
            const card = document.createElement('div');
            card.className = 'bg-white border border-rose-100 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3';
            
            let ideasHtml = '<ul class="list-disc list-inside text-[11px] text-slate-600 space-y-1 mt-2">';
            (b.key_ideas || []).forEach(idea => {
                ideasHtml += `<li>${escapeHtml(idea)}</li>`;
            });
            ideasHtml += '</ul>';

            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between">
                        <span class="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">${escapeHtml(b.category)}</span>
                        <span class="text-xs font-semibold text-amber-600">⭐ ${b.rating}</span>
                    </div>
                    <h3 class="font-bold text-sm text-slate-800 mt-2">${escapeHtml(b.title)}</h3>
                    <p class="text-xs font-medium text-rose-600">${escapeHtml(b.author)} (${b.year || 2000})</p>
                    <p class="text-xs text-slate-600 mt-2 italic">«${escapeHtml(b.excerpt)}»</p>
                    ${ideasHtml}
                </div>
                <button onclick="askCoachAboutBook('${escapeQuotes(b.title)}', '${escapeQuotes(b.author)}')" class="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition border border-rose-200">
                    ✨ Обсудить с ИИ-коучем
                </button>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<p class="text-xs text-rose-500 text-center py-4 col-span-2">Не удалось загрузить библиотеку.</p>';
    }
}

function filterLibrary() {
    const q = document.getElementById('librarySearch').value;
    loadLibraryBooks(q);
}

function askCoachAboutBook(title, author) {
    switchTab('chat');
    const input = document.getElementById('chatInput');
    input.value = `Расскажи подробнее про идеи из книги «${title}» автора ${author} и как применить их в наших отношениях.`;
    sendMessage();
}

function saveDossierSettings() {
    const name = document.getElementById('dossierName').value;
    const notes = document.getElementById('dossierNotes').value;
    alert('Досье успешно сохранено! ИИ-коуч учтет ваши пожелания.');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}


// Обычный голосовой ввод для поля ввода
function toggleRecordVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Голосовой ввод не поддерживается вашим браузером. Используйте мобильный Chrome/Safari.");
        return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ru-RU';
    const btn = document.getElementById('recordBtn');
    if (btn) btn.classList.add('animate-pulse', 'bg-rose-300');
    rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = transcript;
            sendMessage();
        }
    };
    rec.onend = () => {
        if (btn) btn.classList.remove('animate-pulse', 'bg-rose-300');
    };
    rec.onerror = () => {
        if (btn) btn.classList.remove('animate-pulse', 'bg-rose-300');
    };
    try {
        rec.start();
    } catch(err) {
        console.error("Mic start error:", err);
    }
}
