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
let isAITalking = false;
let currentLiveAudio = null;

function toggleLiveVoiceState() {
    isLiveActive = !isLiveActive;
    const orb = document.getElementById('liveOrb');
    const statusText = document.getElementById('liveStatusText');
    const btn = document.getElementById('liveMainBtn');
    const transcript = document.getElementById('liveTranscript');

    if (isLiveActive) {
        orb.classList.add('animate-pulse', 'scale-105', 'shadow-[0_0_80px_rgba(236,72,153,0.8)]');
        statusText.textContent = 'ИИ слушает... Говорите после завершения речи коуча!';
        btn.textContent = 'Остановить разговор';
        transcript.textContent = 'Я слушаю вас... Задайте короткий вопрос или поделитесь чувством.';
        isAITalking = false;
        startBrowserSpeechRecognition();
    } else {
        orb.classList.remove('animate-pulse', 'scale-105', 'shadow-[0_0_80px_rgba(236,72,153,0.8)]');
        statusText.textContent = 'Диалог завершен. Нажмите на сферу, чтобы начать снова.';
        btn.textContent = 'Начать говорить';
        transcript.textContent = 'Диалог приостановлен.';
        isAITalking = false;
        if (currentLiveAudio) {
            try { currentLiveAudio.pause(); } catch(e){}
            currentLiveAudio = null;
        }
        if (liveRecognition) {
            try { liveRecognition.stop(); } catch(e){}
        }
    }
}

function startBrowserSpeechRecognition() {
    if (!isLiveActive || isAITalking) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('liveTranscript').textContent = 'Ваш браузер не поддерживает Web Speech API. Используйте текстовый ввод.';
        return;
    }
    try {
        if (liveRecognition) {
            try { liveRecognition.abort(); } catch(e){}
        }
        liveRecognition = new SpeechRecognition();
        liveRecognition.lang = 'ru-RU';
        liveRecognition.interimResults = false;
        liveRecognition.maxAlternatives = 1;

        liveRecognition.onstart = () => {
            const statusText = document.getElementById('liveStatusText');
            if (statusText && !isAITalking) statusText.textContent = '🎙 Слушаю вас... Говорите!';
        };

        liveRecognition.onresult = async (event) => {
            if (isAITalking) return; // Игнорируем если ИИ уже говорит
            const speechText = event.results[0][0].transcript;
            document.getElementById('liveTranscript').textContent = 'Вы: ' + speechText;
            
            // Включаем статус обработки и выключаем слушание
            isAITalking = true;
            try { liveRecognition.stop(); } catch(e){}

            const statusText = document.getElementById('liveStatusText');
            if (statusText) statusText.textContent = '💖 Коуч думает и отвечает...';

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: speechText, session_id: sessionId, is_voice_mode: true })
                });
                const data = await res.json();
                const reply = data.reply || 'Любимая, я рядом с тобой.';
                document.getElementById('liveTranscript').textContent = 'Коуч: ' + reply;
                
                // Озвучиваем ответ; микрофон включится ТОЛЬКО после окончания звука
                await playLiveTTS(reply);
            } catch (e) {
                document.getElementById('liveTranscript').textContent = 'Ошибка связи. Попробуйте снова.';
                isAITalking = false;
                if (isLiveActive) startBrowserSpeechRecognition();
            }
        };

        liveRecognition.onend = () => {
            // Перезапуск ТОЛЬКО если активен диалог и ИИ НЕ говорит в данный момент!
            if (isLiveActive && !isAITalking) {
                setTimeout(() => {
                    if (isLiveActive && !isAITalking) {
                        try { liveRecognition.start(); } catch(e){}
                    }
                }, 300);
            }
        };

        liveRecognition.onerror = (e) => {
            if (isLiveActive && !isAITalking) {
                setTimeout(() => {
                    if (isLiveActive && !isAITalking) {
                        try { liveRecognition.start(); } catch(e){}
                    }
                }, 600);
            }
        };

        liveRecognition.start();
    } catch (e) {
        console.error(e);
    }
}

async function playLiveTTS(text) {
    return new Promise(async (resolve) => {
        try {
            isAITalking = true;
            const statusText = document.getElementById('liveStatusText');
            if (statusText) statusText.textContent = '🔊 Коуч говорит... Пожалуйста, слушайте.';

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
            
            // Включаем микрофон ТОЛЬКО после завершения речи коуча!
            currentLiveAudio.onended = () => {
                isAITalking = false;
                currentLiveAudio = null;
                const statusText = document.getElementById('liveStatusText');
                if (statusText) statusText.textContent = '🎙 Ваша очередь говорить... Я внимательно слушаю!';
                if (isLiveActive) {
                    setTimeout(() => startBrowserSpeechRecognition(), 400);
                }
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

// НЕМЕЦКИЙ КУРС
async function loadGermanCourse(level) {
    ['a1', 'a2', 'b1'].forEach(l => {
        const btn = document.getElementById('german-btn-' + l);
        if (btn) {
            if (l === level.toLowerCase()) {
                btn.className = 'px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500 text-white shadow';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition';
            }
        }
    });

    const container = document.getElementById('germanContent');
    container.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">Загрузка уроков немецкого...</div>';

    try {
        const res = await fetch('/api/german/course');
        const data = await res.json();
        
        container.innerHTML = '';

        // 1. Отображаем карточку плана обучения для текущего уровня
        if (data.study_plan) {
            const planItem = data.study_plan.find(p => p.stage.startsWith(level)) || data.study_plan[0];
            const planCard = document.createElement('div');
            planCard.className = 'bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/70 rounded-xl p-3.5 shadow-sm text-xs space-y-1 mb-2';
            planCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold text-amber-900 flex items-center gap-1.5">🎯 ` + escapeHtml(planItem.stage) + `</span>
                    <span class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[10px]">Срок: ` + escapeHtml(planItem.duration) + `</span>
                </div>
                <p class="text-slate-600">` + escapeHtml(planItem.goal) + `</p>
            `;
            container.appendChild(planCard);
        }

        const lessons = data.lessons.filter(l => l.level === level);
        if (lessons.length === 0) {
            container.innerHTML += '<p class="text-xs text-slate-500 text-center py-4">Уроков для этого уровня пока нет.</p>';
            return;
        }

        lessons.forEach(lesson => {
            const card = document.createElement('div');
            card.className = 'bg-white border border-rose-100 rounded-xl p-4 space-y-3 shadow-sm';
            
            let vocabHtml = '<div class="space-y-2 mt-2">';
            lesson.vocabulary.forEach(v => {
                const voiceHint = v.voice_hint || 'de-DE-KatjaNeural';
                const speakerName = voiceHint.includes('Conrad') ? 'Conrad 👨' : 'Katja 👩';
                vocabHtml += `
                    <div class="flex items-center justify-between bg-rose-50/40 p-2.5 rounded-lg border border-rose-100/60 text-xs gap-2">
                        <div class="flex-1">
                            <span class="font-bold text-rose-900">` + escapeHtml(v.german) + `</span>
                            <span class="text-slate-600 block sm:inline sm:ml-2">(` + escapeHtml(v.russian) + `)</span>
                        </div>
                        <button onclick="playTTS(this, '` + escapeQuotes(v.german) + `', '` + voiceHint + `')" class="px-2.5 py-1.5 bg-white text-rose-700 font-semibold rounded-lg shadow-sm border border-rose-200 hover:bg-rose-100 transition shrink-0 flex items-center gap-1 text-[11px]" title="Озвучить немецким диктором">
                            <span>🔊</span> <span>` + speakerName + `</span>
                        </button>
                    </div>
                `;
            });
            vocabHtml += '</div>';

            let dialogueHtml = '';
            if (lesson.dialogue_simulator) {
                dialogueHtml = `
                    <div class="mt-3 bg-purple-50/60 border border-purple-100 rounded-lg p-3 text-xs space-y-1">
                        <div class="font-bold text-purple-900 flex items-center gap-1">💬 Интерактивный диалог: ` + escapeHtml(lesson.dialogue_simulator.situation) + `</div>
                        <div class="text-purple-700 italic">Пример: «` + escapeHtml(lesson.dialogue_simulator.example) + `»</div>
                        <div class="text-slate-500 text-[11px]">💡 Подсказка: ` + escapeHtml(lesson.dialogue_simulator.tips) + `</div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold">` + lesson.level + `</span>
                        <h3 class="font-bold text-sm text-slate-800">` + escapeHtml(lesson.title) + `</h3>
                    </div>
                    <p class="text-xs text-rose-700 font-medium mt-1.5 bg-rose-50/70 p-2 rounded-lg border border-rose-100">📖 Грамматика: ` + escapeHtml(lesson.grammar) + `</p>
                    ` + (lesson.rule_explanation ? `<p class="text-[11px] text-slate-600 mt-1 italic pl-1">💡 ` + escapeHtml(lesson.rule_explanation) + `</p>` : '') + `
                </div>
                ` + vocabHtml + `
                ` + dialogueHtml + `
            `;
            container.appendChild(card);
        });
    } catch (e) {
        container.innerHTML = '<div class="text-center py-6 text-rose-500 text-xs">Ошибка загрузки немецкого курса. Попробуйте обновить страницу.</div>';
    }
}


