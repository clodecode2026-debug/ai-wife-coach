// Global State for Multi-chats & UI
let currentSessionId = null;

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-pink-600', 'font-semibold');
        btn.classList.add('text-slate-400', 'font-medium');
    });

    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400', 'font-medium');
        activeBtn.classList.add('text-pink-600', 'font-semibold');
    }

    if (tabName === 'dossier') loadDossier();
    if (tabName === 'library') loadBooks();
    if (tabName === 'tasks') loadTasks();
    if (tabName === 'coach' && !currentSessionId) loadSessions();
}

function toggleSidebar() {
    const sidebar = document.getElementById('chat-sidebar');
    sidebar.classList.toggle('hidden');
    sidebar.classList.toggle('absolute');
    sidebar.classList.toggle('z-50');
    sidebar.classList.toggle('bg-white');
    sidebar.classList.toggle('h-full');
}

// MULTI-CHATS MANAGEMENT
async function loadSessions() {
    try {
        const res = await fetch('/api/chat/sessions');
        const sessions = await res.json();
        const listContainer = document.getElementById('sessions-list');
        
        if (!sessions || sessions.length === 0) {
            await createNewSession(false);
            return;
        }

        if (!currentSessionId && sessions.length > 0) {
            currentSessionId = sessions[0].id;
            document.getElementById('current-chat-title').innerText = sessions[0].title;
            loadMessages(currentSessionId);
        }

        listContainer.innerHTML = sessions.map(s => `
            <div onclick="selectSession('${s.id}', '${escapeHtml(s.title || 'Разговор')}')" class="p-3 rounded-2xl text-xs cursor-pointer transition ${currentSessionId === s.id ? 'bg-pink-100/80 text-pink-900 font-semibold border border-pink-200' : 'bg-pink-50/40 hover:bg-pink-50 text-slate-700'}">
                <div class="truncate font-medium">${escapeHtml(s.title || 'Разговор')}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">${new Date(s.created_at || Date.now()).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch(e) {
        console.error("Error loading sessions:", e);
    }
}

async function createNewSession(reload = true) {
    try {
        const title = prompt("Название нового разговора:", "Уютный разговор 💖") || "Разговор";
        const res = await fetch('/api/chat/sessions', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title })
        });
        const session = await res.json();
        currentSessionId = session.id;
        document.getElementById('current-chat-title').innerText = session.title;
        
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = `
            <div class="flex items-start space-x-2">
                <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
                <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm">
                    Привет! Я создала для тебя новый уютный уголок. О чём хочешь поговорить?
                </div>
            </div>
        `;
        if (reload) loadSessions();
    } catch(e) {
        console.error("Error creating session:", e);
    }
}

async function selectSession(sessionId, title) {
    currentSessionId = sessionId;
    document.getElementById('current-chat-title').innerText = title;
    await loadMessages(sessionId);
    loadSessions();
}

async function loadMessages(sessionId) {
    try {
        const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
        const messages = await res.json();
        const messagesContainer = document.getElementById('chat-messages');
        
        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="flex items-start space-x-2">
                    <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
                    <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm">
                        Я слушаю тебя в этом чате. Расскажи, что на душе?
                    </div>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = messages.map(m => {
            if (m.role === 'user') {
                return `
                    <div class="flex items-end justify-end space-x-2">
                        <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3.5 max-w-[85%] text-sm shadow-sm">
                            ${escapeHtml(m.content)}
                        </div>
                        <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm shrink-0">👤</div>
                    </div>
                `;
            } else {
                return `
                    <div class="flex items-start space-x-2">
                        <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
                        <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm text-slate-700">
                            ${escapeHtml(m.content)}
                            <div class="mt-2 flex gap-2 items-center">
                                <button onclick="speakText(this.parentElement.parentElement.innerText)" class="text-[10px] bg-white text-pink-600 border border-pink-200 px-2 py-0.5 rounded-full hover:bg-pink-50 transition">🔊 Озвучить</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch(e) {
        console.error("Error loading messages:", e);
    }
}

// COACH CHAT & TTS / SPEECH RECOGNITION
async function sendChatMessage(presetText = null) {
    const input = document.getElementById('chat-input');
    const text = presetText || input.value.trim();
    if (!text) return;

    if (!presetText) input.value = '';
    if (!currentSessionId) {
        await createNewSession(false);
    }

    const messagesContainer = document.getElementById('chat-messages');

    messagesContainer.innerHTML += `
        <div class="flex items-end justify-end space-x-2">
            <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3.5 max-w-[85%] text-sm shadow-sm">
                ${escapeHtml(text)}
            </div>
            <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm shrink-0">👤</div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    messagesContainer.innerHTML += `
        <div id="${loadingId}" class="flex items-start space-x-2">
            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
            <div class="bg-pink-50/80 rounded-2xl p-3.5 text-sm text-slate-400 border border-pink-100">вспоминаю и печатаю ответ...</div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, session_id: currentSessionId })
        });
        const data = await response.json();

        document.getElementById(loadingId).remove();

        messagesContainer.innerHTML += `
            <div class="flex items-start space-x-2">
                <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
                <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm text-slate-700">
                    ${escapeHtml(data.response)}
                    <div class="mt-2 flex gap-2 items-center">
                        <button onclick="speakText('${escapeQuotes(data.response)}')" class="text-[10px] bg-white text-pink-600 border border-pink-200 px-2.5 py-0.5 rounded-full hover:bg-pink-50 transition shadow-sm">🔊 Озвучить голос</button>
                    </div>
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Автоматическая озвучка мягким тембром
        speakText(data.response);
    } catch (e) {
        document.getElementById(loadingId).remove();
        messagesContainer.innerHTML += `
            <div class="text-xs text-red-500 text-center py-2">Не удалось связаться с коучем. Попробуй ещё раз.</div>
        `;
    }
}

function sendMood(mood) {
    sendChatMessage(`Мне сейчас ${mood.toLowerCase()}, поддержи меня.`);
}

function clearChat() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="flex items-start space-x-2">
            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm shrink-0">💖</div>
            <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm">
                Чат очищен. О чём тебе хочется поговорить сейчас?
            </div>
        </div>
    `;
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

// Live Voice: SpeechRecognition & SpeechSynthesis
function toggleVoice() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Голосовой ввод не поддерживается вашим браузером.');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    
    const btn = document.getElementById('voice-btn');
    btn.classList.add('bg-pink-400', 'text-white', 'animate-pulse');

    recognition.onresult = function(event) {
        const text = event.results[0][0].transcript;
        document.getElementById('chat-input').value = text;
        btn.classList.remove('bg-pink-400', 'text-white', 'animate-pulse');
        sendChatMessage(text);
    };
    recognition.onerror = function() {
        btn.classList.remove('bg-pink-400', 'text-white', 'animate-pulse');
    };
    recognition.onend = function() {
        btn.classList.remove('bg-pink-400', 'text-white', 'animate-pulse');
    };
    recognition.start();
}

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.95; // Мягкий неторопливый темп
    utterance.pitch = 1.1; // Теплый мягкий тон
    window.speechSynthesis.speak(utterance);
}

// DOSSIER (WIFE'S MEMORY)
async function loadDossier() {
    try {
        const res = await fetch('/api/dossier');
        const dossier = await res.json();
        const grid = document.getElementById('dossier-grid');

        if (!dossier || dossier.length === 0) {
            grid.innerHTML = `<div class="col-span-2 text-center text-xs text-slate-400 py-6">Досье пока пусто. Добавь первый факт!</div>`;
            return;
        }

        const categoryNames = {
            'preference': '☕️ Предпочтение',
            'joy': '✨ Радость',
            'trigger': '⚠️ Триггер',
            'goal': '🎯 Цель',
            'health': '🌿 Здоровье'
        };

        grid.innerHTML = dossier.map(item => `
            <div class="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-semibold">${categoryNames[item.category] || item.category}</span>
                        <span class="text-[10px] text-slate-400">Важность: ${item.importance || 3}/5</span>
                    </div>
                    <h4 class="font-bold text-slate-800 text-sm mt-1">${escapeHtml(item.key_name)}</h4>
                    <p class="text-xs text-slate-600 mt-1">${escapeHtml(item.value)}</p>
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error("Error loading dossier:", e);
    }
}

function openAddDossierModal() {
    document.getElementById('dossier-modal').classList.remove('hidden');
    document.getElementById('dossier-modal').classList.add('flex');
}

function closeAddDossierModal() {
    document.getElementById('dossier-modal').classList.add('hidden');
    document.getElementById('dossier-modal').classList.remove('flex');
}

async function saveDossierFact() {
    const category = document.getElementById('dos-category').value;
    const key_name = document.getElementById('dos-key').value.trim();
    const value = document.getElementById('dos-value').value.trim();

    if (!key_name || !value) {
        alert('Заполните все поля!');
        return;
    }

    try {
        await fetch('/api/dossier', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ category, key_name, value, importance: 4 })
        });
        closeAddDossierModal();
        document.getElementById('dos-key').value = '';
        document.getElementById('dos-value').value = '';
        loadDossier();
    } catch(e) {
        console.error("Error saving dossier fact:", e);
    }
}

// GERMAN TRAINER
let currentFlashcards = [];
let currentCardIndex = 0;
let isCardFlipped = false;

async function loadGermanFlashcards(level) {
    document.querySelectorAll('.german-level-btn').forEach(btn => {
        btn.className = 'german-level-btn bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-xs font-medium';
    });
    event.target.className = 'german-level-btn bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow';

    try {
        const res = await fetch(`/api/german/flashcards?level=${level}`);
        currentFlashcards = await res.json();
        currentCardIndex = 0;
        isCardFlipped = false;
        renderFlashcard();
    } catch(e) { console.error(e); }
}

function renderFlashcard() {
    if (!currentFlashcards.length) return;
    const card = currentFlashcards[currentCardIndex % currentFlashcards.length];
    document.getElementById('fc-level').innerText = card.level;
    document.getElementById('fc-word').innerText = isCardFlipped ? card.translation : card.word;
    document.getElementById('fc-translation').innerText = card.translation;
    document.getElementById('fc-translation').classList.toggle('hidden', !isCardFlipped);
    document.getElementById('fc-example').innerText = `Пример: ${card.example}`;
    document.getElementById('fc-example').classList.toggle('hidden', !isCardFlipped);
}

function flipCard() {
    isCardFlipped = !isCardFlipped;
    renderFlashcard();
    if (!isCardFlipped) {
        currentCardIndex++;
        renderFlashcard();
    }
}

// LIBRARY
async function loadBooks() {
    try {
        const res = await fetch('/api/books');
        const books = await res.json();
        renderBooks(books);
    } catch(e) { console.error(e); }
}

function renderBooks(books) {
    const container = document.getElementById('books-list');
    container.innerHTML = books.map(b => `
        <div class="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
                <h3 class="font-bold text-slate-800 text-sm">${escapeHtml(b.title)}</h3>
                <p class="text-xs text-amber-800 italic mt-1">«${escapeHtml(b.quote)}»</p>
            </div>
            <div class="text-[10px] text-slate-400 mt-3 pt-2 border-t border-amber-100/60">Мудрость дня</div>
        </div>
    `).join('');
}

async function searchBooks() {
    const q = document.getElementById('book-search').value.trim();
    try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`);
        const books = await res.json();
        renderBooks(books);
    } catch(e) { console.error(e); }
}

// TASKS
async function loadTasks() {
    try {
        const res = await fetch('/api/tasks');
        const tasks = await res.json();
        const container = document.getElementById('tasks-list');

        container.innerHTML = tasks.map(t => `
            <div class="flex items-center justify-between bg-emerald-50/40 border border-emerald-100 p-3 rounded-2xl shadow-sm">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onclick="toggleTask(${t.id})" class="w-4 h-4 accent-emerald-500 rounded cursor-pointer">
                    <span class="text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}">${escapeHtml(t.title)}</span>
                </div>
                <button onclick="deleteTask(${t.id})" class="text-xs text-slate-400 hover:text-red-500 px-2 py-1 transition">✕</button>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

async function addTask() {
    const input = document.getElementById('task-input');
    const title = input.value.trim();
    if (!title) return;

    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, category: 'Забота' })
        });
        input.value = '';
        loadTasks();
    } catch(e) { console.error(e); }
}

function handleTaskKey(e) {
    if (e.key === 'Enter') addTask();
}

async function toggleTask(id) {
    try {
        await fetch(`/api/tasks/${id}/toggle`, { method: 'POST' });
        loadTasks();
    } catch(e) { console.error(e); }
}

async function deleteTask(id) {
    try {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        loadTasks();
    } catch(e) { console.error(e); }
}

// Helpers
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeQuotes(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Initial load
window.onload = function() {
    loadSessions();
};
