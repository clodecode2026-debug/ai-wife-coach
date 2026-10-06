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

    if (tabName === 'library') loadBooks();
    if (tabName === 'tasks') loadTasks();
}

// COACH CHAT
async function sendChatMessage(presetText = null) {
    const input = document.getElementById('chat-input');
    const text = presetText || input.value.trim();
    if (!text) return;

    if (!presetText) input.value = '';

    const messagesContainer = document.getElementById('chat-messages');

    // Append user message
    messagesContainer.innerHTML += `
        <div class="flex items-end justify-end space-x-2">
            <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3.5 max-w-[80%] text-sm shadow-sm">
                ${escapeHtml(text)}
            </div>
            <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm">👤</div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Loading indicator
    const loadingId = 'loading-' + Date.now();
    messagesContainer.innerHTML += `
        <div id="${loadingId}" class="flex items-start space-x-2">
            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm">💖</div>
            <div class="bg-pink-50/80 rounded-2xl p-3.5 text-sm text-slate-400 border border-pink-100">печатаю ответ...</div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await response.json();

        document.getElementById(loadingId).remove();

        messagesContainer.innerHTML += `
            <div class="flex items-start space-x-2">
                <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm">💖</div>
                <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[80%] text-sm border border-pink-100 shadow-sm text-slate-700">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold text-pink-600">Коуч Света</span>
                        <button onclick="playTTS(this, \`${escapeJsString(data.response)}\`)" class="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full hover:bg-pink-200 transition flex items-center gap-1">🔊 Слушать голос</button>
                    </div>
                    <div>${escapeHtml(data.response)}</div>
                </div>
            </div>
        `;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Автоматически озвучиваем голос коуча
        playTTSAuto(data.response);
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
            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm">💖</div>
            <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[80%] text-sm border border-pink-100 shadow-sm">
                Чат очищен. О чём тебе хочется поговорить сейчас?
            </div>
        </div>
    `;
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

// Audio / TTS playback for coach voice mode
let isVoiceModeActive = false;

async function playCoachVoice(text) {
    try {
        const response = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, voice: 'ru-RU-SvetlanaNeural' })
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
    } catch (e) {
        console.error('TTS playback error:', e);
    }
}

function toggleLiveVoiceMode() {
    isVoiceModeActive = !isVoiceModeActive;
    const btn = document.getElementById('live-voice-btn');
    if (isVoiceModeActive) {
        btn.classList.add('bg-pink-500', 'text-white');
        btn.classList.remove('bg-pink-100', 'text-pink-600');
        btn.innerText = '🔴 Живой голос вкл';
        toggleVoice();
    } else {
        btn.classList.remove('bg-pink-500', 'text-white');
        btn.classList.add('bg-pink-100', 'text-pink-600');
        btn.innerText = '🎙️ Голос';
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

async function checkGermanSentence() {
    const text = document.getElementById('german-input').value.trim();
    if (!text) return;

    try {
        const res = await fetch('/api/german/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sentence: text })
        });
        const data = await res.json();
        const fb = document.getElementById('german-feedback');
        fb.classList.remove('hidden');
        fb.innerHTML = `<strong>Результат:</strong> ${escapeHtml(data.feedback)}`;
    } catch(e) { console.error(e); }
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
        renderTasks(tasks);
    } catch(e) { console.error(e); }
}

function renderTasks(tasks) {
    const container = document.getElementById('tasks-list');
    container.innerHTML = tasks.map(t => `
        <div class="flex items-center justify-between p-3 bg-pink-50/40 border border-pink-100 rounded-2xl shadow-sm">
            <div class="flex items-center space-x-3">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${t.id})" class="w-4 h-4 text-pink-600 rounded border-pink-300 focus:ring-pink-400">
                <span class="text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}">${escapeHtml(t.title)}</span>
            </div>
            <button onclick="deleteTask(${t.id})" class="text-slate-400 hover:text-red-500 text-xs px-2 py-1">✕</button>
        </div>
    `).join('');
}

async function addNewTask() {
    const input = document.getElementById('new-task-input');
    const title = input.value.trim();
    if (!title) return;

    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        input.value = '';
        loadTasks();
    } catch(e) { console.error(e); }
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

function handleTaskKey(e) {
    if (e.key === 'Enter') addNewTask();
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Initial load
window.onload = () => {
    loadGermanFlashcards('A1');
};
