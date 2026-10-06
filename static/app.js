// AI Wife Coach - Client Script
let activeSessionId = localStorage.getItem('ai_wife_session_id') || null;
let isVoiceOutputEnabled = true;

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove('hidden');

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
    if (tabName === 'coach') loadSessions();
}

// COACH CHAT
async function sendChatMessage(presetText = null) {
    const input = document.getElementById('chat-input');
    const text = presetText || (input ? input.value.trim() : '');
    if (!text) return;

    if (!presetText && input) input.value = '';

    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    // Append user message bubble
    const userDiv = document.createElement('div');
    userDiv.className = 'flex items-end justify-end space-x-2';
    userDiv.innerHTML = `
        <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3.5 max-w-[85%] text-sm shadow-sm break-words">
            ${escapeHtml(text)}
        </div>
        <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm flex-shrink-0">👤</div>
    `;
    messagesContainer.appendChild(userDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Loading indicator
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'flex items-start space-x-2';
    loadingDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm flex-shrink-0 animate-pulse">💖</div>
        <div class="bg-pink-50/80 rounded-2xl p-3.5 text-sm text-pink-500 border border-pink-100 italic">Слушаю тебя, дорогая...</div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        const payload = { message: text };
        if (activeSessionId) payload.session_id = activeSessionId;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const loadEl = document.getElementById(loadingId);
        if (loadEl) loadEl.remove();

        if (data.session_id) {
            activeSessionId = data.session_id;
            localStorage.setItem('ai_wife_session_id', activeSessionId);
            loadSessions();
        }

        const replyText = data.reply || data.response || data.answer || 'Я рядом с тобой, милая.';
        const gentleQ = data.gentle_question ? `<div class="mt-2 pt-2 border-t border-pink-100 text-xs text-purple-700 font-medium">✨ ${escapeHtml(data.gentle_question)}</div>` : '';

        const replyDiv = document.createElement('div');
        replyDiv.className = 'flex items-start space-x-2';
        replyDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm flex-shrink-0">💖</div>
            <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm text-slate-700 break-words">
                ${escapeHtml(replyText)}
                ${gentleQ}
            </div>
        `;
        messagesContainer.appendChild(replyDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Speak reply via Server edge-tts (SvetlanaNeural)
        if (isVoiceOutputEnabled) {
            playServerVoice(replyText);
        }
    } catch (e) {
        console.error('Chat error:', e);
        const loadEl = document.getElementById(loadingId);
        if (loadEl) loadEl.remove();

        const errDiv = document.createElement('div');
        errDiv.className = 'text-xs text-rose-500 text-center py-2';
        errDiv.innerText = 'Сервер на связи. Пожалуйста, попробуй отправить ещё раз.';
        messagesContainer.appendChild(errDiv);
    }
}

function sendMood(mood) {
    sendChatMessage(`Мне сейчас ${mood.toLowerCase()}, побудь со мной.`);
}

function clearChat() {
    activeSessionId = null;
    localStorage.removeItem('ai_wife_session_id');
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="flex items-start space-x-2">
                <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm flex-shrink-0">💖</div>
                <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm">
                    Новый разговор начат. О чём тебе хочется поговорить сейчас, милая?
                </div>
            </div>
        `;
    }
    loadSessions();
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

// VOICE INPUT
function toggleVoice() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        alert('Голосовой ввод не поддерживается браузером. Попробуйте Chrome или Safari.');
        return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    
    const btn = document.getElementById('voice-btn');
    if (btn) btn.classList.add('bg-pink-500', 'text-white', 'animate-pulse');

    recognition.onresult = function(event) {
        if (event.results && event.results[0]) {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('chat-input');
            if (input) input.value = transcript;
        }
        if (btn) btn.classList.remove('bg-pink-500', 'text-white', 'animate-pulse');
    };

    recognition.onerror = function(err) {
        console.warn('Speech error:', err);
        if (btn) btn.classList.remove('bg-pink-500', 'text-white', 'animate-pulse');
    };

    recognition.onend = function() {
        if (btn) btn.classList.remove('bg-pink-500', 'text-white', 'animate-pulse');
    };

    recognition.start();
}

// VOICE OUTPUT (Live Server Voice via edge-tts SvetlanaNeural) + Visualizer
async function playServerVoice(text) {
    if (!text || !text.trim()) return;
    const cleanText = text.replace(/[*_#✨💖🌸☕️💡👤]/g, '');
    
    // Add visual glowing wave effect on coach card / header
    const coachCard = document.getElementById('tab-coach');
    if (coachCard) {
        coachCard.classList.add('voice-speaking-pulse');
    }

    try {
        const resp = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: cleanText, voice: 'ru-RU-SvetlanaNeural' })
        });
        if (!resp.ok) throw new Error('Voice fetch failed: ' + resp.status);
        const blob = await resp.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
            if (coachCard) coachCard.classList.remove('voice-speaking-pulse');
        };
        audio.onerror = () => {
            if (coachCard) coachCard.classList.remove('voice-speaking-pulse');
        };

        await audio.play();
    } catch (err) {
        console.error('Audio play error:', err);
        if (coachCard) coachCard.classList.remove('voice-speaking-pulse');
        // Fallback to Web Speech API if server tts unreachable
        fallbackSpeakText(cleanText);
    }
}

function fallbackSpeakText(text) {
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*_#✨💖🌸☕️💡👤]/g, '');
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('Fallback speech error:', e);
    }
}

// SESSIONS / HISTORY
async function loadSessions() {
    try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        const list = document.getElementById('chat-sessions-list');
        if (!list) return;

        if (!data.sessions || data.sessions.length === 0) {
            list.innerHTML = `<div class="text-[11px] text-slate-400 italic">Нет сохраненных историй пока</div>`;
            return;
        }

        list.innerHTML = data.sessions.map(s => `
            <div onclick="switchSession('${s.id}')" class="p-2 bg-white rounded-xl border border-pink-100 hover:bg-pink-100/50 cursor-pointer text-xs flex justify-between items-center transition ${activeSessionId === s.id ? 'border-pink-400 bg-pink-50 font-semibold' : ''}">
                <span class="truncate max-w-[200px] text-slate-700">${escapeHtml(s.title || 'Разговор')}</span>
                <span class="text-[10px] text-slate-400">${new Date(s.updated_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `).join('');
    } catch (e) {
        console.warn('Load sessions error:', e);
    }
}

async function switchSession(sessionId) {
    activeSessionId = sessionId;
    localStorage.setItem('ai_wife_session_id', sessionId);
    document.getElementById('sessions-drawer').classList.add('hidden');
    
    try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        if (data.messages && data.messages.length > 0) {
            messagesContainer.innerHTML = data.messages.map(m => {
                if (m.role === 'user') {
                    return `
                        <div class="flex items-end justify-end space-x-2">
                            <div class="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl p-3.5 max-w-[85%] text-sm shadow-sm break-words">${escapeHtml(m.content)}</div>
                            <div class="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-sm flex-shrink-0">👤</div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="flex items-start space-x-2">
                            <div class="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-sm flex-shrink-0">💖</div>
                            <div class="bg-pink-50/80 rounded-2xl p-3.5 max-w-[85%] text-sm border border-pink-100 shadow-sm text-slate-700 break-words">${escapeHtml(m.content)}</div>
                        </div>
                    `;
                }
            }).join('');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (e) {
        console.error('Switch session error:', e);
    }
    loadSessions();
}

// GERMAN FLASHCARDS & QUIZ
let currentFlashcards = [];
let currentCardIndex = 0;
let isCardFlipped = false;

async function loadGermanFlashcards(level, btnEl) {
    document.querySelectorAll('.german-level-btn').forEach(b => {
        b.className = 'german-level-btn bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-xs font-medium';
    });
    if (btnEl) {
        btnEl.className = 'german-level-btn bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow';
    }

    try {
        const res = await fetch(`/api/german/cards?level=${level}`);
        const data = await res.json();
        currentFlashcards = data.cards || [];
        currentCardIndex = 0;
        isCardFlipped = false;
        displayCurrentCard();
    } catch (e) {
        console.error('Load german cards error:', e);
    }
}

function displayCurrentCard() {
    if (!currentFlashcards.length) return;
    const card = currentFlashcards[currentCardIndex];
    const lvlEl = document.getElementById('fc-level');
    const wordEl = document.getElementById('fc-word');
    const transEl = document.getElementById('fc-translation');
    const exEl = document.getElementById('fc-example');

    if (lvlEl) lvlEl.innerText = card.level || 'A1';
    if (wordEl) wordEl.innerText = card.word;
    if (transEl) {
        transEl.innerText = card.translation;
        transEl.classList.add('hidden');
    }
    if (exEl) {
        if (card.example) {
            exEl.innerText = `Пример: ${card.example} (${card.example_translation || ''})`;
            exEl.classList.add('hidden');
        } else {
            exEl.classList.add('hidden');
        }
    }
    isCardFlipped = false;
}

function flipCard() {
    isCardFlipped = !isCardFlipped;
    const transEl = document.getElementById('fc-translation');
    const exEl = document.getElementById('fc-example');
    if (transEl) {
        if (isCardFlipped) transEl.classList.remove('hidden');
        else transEl.classList.add('hidden');
    }
    if (exEl && currentFlashcards.length) {
        const card = currentFlashcards[currentCardIndex];
        if (card.example) {
            if (isCardFlipped) exEl.classList.remove('hidden');
            else exEl.classList.add('hidden');
        }
    }
}

function nextCard() {
    if (!currentFlashcards.length) return;
    currentCardIndex = (currentCardIndex + 1) % currentFlashcards.length;
    displayCurrentCard();
}

async function pronounceGerman(word) {
    if (!word) return;
    try {
        const resp = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ text: word, voice: 'de-DE-KatjaNeural' })
        });
        if (!resp.ok) throw new Error('German TTS failed');
        const blob = await resp.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.play();
    } catch (e) {
        console.warn('German TTS error, using fallback');
        fallbackSpeakText(word);
    }
}

// LIBRARY
async function loadBooks() {
    try {
        const res = await fetch('/api/library/books');
        const data = await res.json();
        const container = document.getElementById('library-books');
        if (!container) return;

        if (!data.books || data.books.length === 0) {
            container.innerHTML = `<div class="text-sm text-slate-400">Библиотека пуста</div>`;
            return;
        }

        container.innerHTML = data.books.map(b => `
            <div onclick="openBook('${b.id}')" class="bg-gradient-to-br from-amber-50 to-pink-50 p-4 rounded-2xl border border-amber-200/60 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between">
                <div>
                    <span class="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">${escapeHtml(b.category || 'Книга')}</span>
                    <h3 class="font-bold text-slate-800 mt-2 text-sm sm:text-base">${escapeHtml(b.title)}</h3>
                    <p class="text-xs text-slate-600 mt-1">${escapeHtml(b.author)}</p>
                </div>
                <div class="mt-4 flex items-center justify-between text-xs text-purple-600 font-semibold">
                    <span>Читать конспект ➔</span>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Load books error:', e);
    }
}

async function openBook(bookId) {
    try {
        const res = await fetch(`/api/library/books/${bookId}`);
        const b = await res.json();
        const view = document.getElementById('book-reader-view');
        const list = document.getElementById('library-list-view');
        if (!view || !list) return;

        list.classList.add('hidden');
        view.classList.remove('hidden');

        document.getElementById('reader-title').innerText = b.title;
        document.getElementById('reader-author').innerText = b.author;
        document.getElementById('reader-summary').innerText = b.summary || '';

        const quotesEl = document.getElementById('reader-quotes');
        if (b.quotes && b.quotes.length > 0) {
            quotesEl.innerHTML = `<h4 class="font-bold text-xs text-amber-800 mb-2">💡 Ключевые цитаты:</h4>` + 
                b.quotes.map(q => `<blockquote class="italic text-xs text-slate-700 bg-white/70 p-2.5 rounded-xl border border-amber-100 mb-2">«${escapeHtml(q)}»</blockquote>`).join('');
        } else {
            quotesEl.innerHTML = '';
        }
    } catch (e) {
        console.error('Open book error:', e);
    }
}

function closeBookReader() {
    const view = document.getElementById('book-reader-view');
    const list = document.getElementById('library-list-view');
    if (view && list) {
        view.classList.add('hidden');
        list.classList.remove('hidden');
    }
}

// TASKS
async function loadTasks() {
    try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        const container = document.getElementById('tasks-list');
        if (!container) return;

        if (!data.tasks || data.tasks.length === 0) {
            container.innerHTML = `<div class="text-sm text-slate-400 text-center py-6">У тебя нет задач. Отдохни и побудь собой! ✨</div>`;
            return;
        }

        container.innerHTML = data.tasks.map(t => `
            <div class="bg-white p-3.5 rounded-2xl border border-pink-100 flex items-center justify-between shadow-sm">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="w-4 h-4 text-pink-600 rounded focus:ring-pink-400 cursor-pointer">
                    <span class="text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}">${escapeHtml(t.title)}</span>
                </div>
                <button onclick="deleteTask('${t.id}')" class="text-slate-300 hover:text-rose-500 text-xs px-2 py-1 transition">✕</button>
            </div>
        `).join('');
    } catch (e) {
        console.error('Load tasks error:', e);
    }
}

async function addTask() {
    const input = document.getElementById('new-task-input');
    if (!input || !input.value.trim()) return;
    const title = input.value.trim();
    input.value = '';

    try {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title })
        });
        loadTasks();
    } catch (e) {
        console.error('Add task error:', e);
    }
}

async function toggleTask(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}/toggle`, { method: 'POST' });
        loadTasks();
    } catch (e) {
        console.error('Toggle task error:', e);
    }
}

async function deleteTask(taskId) {
    try {
        await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        loadTasks();
    } catch (e) {
        console.error('Delete task error:', e);
    }
}

// Helpers
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
});
