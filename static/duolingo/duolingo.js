// Lingo (Duolingo Clone Engine) — Портированный интерактивный движок Duolingo для Алины
// Использует оригинальные звуки (/static/duolingo/correct.wav, incorrect.wav, finish.mp3)
// и ассеты совы (/static/duolingo/mascot.svg, heart.svg, points.svg)

if (typeof window.escapeHtml !== 'function') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
}
if (typeof window.escapeQuotes !== 'function') {
    window.escapeQuotes = function(str) {
        if (!str) return '';
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    };
}

class LingoGameEngine {
    constructor() {
        this.hearts = parseInt(localStorage.getItem('lingo_hearts') || '5', 10);
        this.xp = parseInt(localStorage.getItem('lingo_xp') || '0', 10);
        this.streak = parseInt(localStorage.getItem('lingo_streak') || '1', 10);
        this.currentLessonId = 1;
        this.currentChallenges = [];
        this.currentChallengeIndex = 0;
        this.selectedOptionIndex = null;
        this.status = 'none'; // 'none' | 'correct' | 'wrong' | 'completed'
        this.isAudioPlaying = false;

        // Предзагрузка оригинальных звуков Lingo
        this.audioCorrect = new Audio('/static/duolingo/correct.wav');
        this.audioIncorrect = new Audio('/static/duolingo/incorrect.wav');
        this.audioFinish = new Audio('/static/duolingo/finish.mp3');
    }

    playSound(type) {
        try {
            if (type === 'correct') {
                this.audioCorrect.currentTime = 0;
                this.audioCorrect.play().catch(() => {});
            } else if (type === 'incorrect') {
                this.audioIncorrect.currentTime = 0;
                this.audioIncorrect.play().catch(() => {});
            } else if (type === 'finish') {
                this.audioFinish.currentTime = 0;
                this.audioFinish.play().catch(() => {});
            }
        } catch(e) {}
    }

    async startLesson(lessonId, lessonsData) {
        this.currentLessonId = lessonId || 1;
        this.selectedOptionIndex = null;
        this.status = 'none';
        this.currentChallengeIndex = 0;

        if (!lessonsData || !lessonsData.length) {
            try {
                const res = await fetch('/api/german/course');
                const data = await res.json();
                lessonsData = data.lessons || [];
            } catch(e) {
                lessonsData = [];
            }
        }

        const lesson = (lessonsData && lessonsData.length > 0) 
            ? (lessonsData.find(l => l.id == this.currentLessonId) || lessonsData[0]) 
            : null;

        if (!lesson) {
            const container = document.getElementById('lingoAppContainer');
            if (container) {
                container.innerHTML = '<div class="text-center p-8 text-rose-500 font-bold text-sm">Загрузка уроков Duolingo... Нажмите кнопку ещё раз через мгновение.</div>';
            }
            return;
        }

        this.currentChallenges = this.generateChallenges(lesson, lessonsData);
        this.render();
    }

    generateChallenges(lesson, allLessons) {
        const challenges = [];
        const vocab = lesson.vocabulary || [];

        // 1. Выбор немецкого слова по русскому переводу
        if (vocab.length > 0) {
            vocab.slice(0, 5).forEach((item, idx) => {
                // Подбираем 2 случайных дистрактора (неправильных ответа)
                const otherWords = allLessons.flatMap(l => l.vocabulary || []).filter(v => v.german !== item.german);
                const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 2);

                const options = [
                    { text: item.german, transcription: item.transcription, isCorrect: true, audioSrc: item.german, voiceHint: item.voice_hint },
                    { text: shuffledOthers[0]?.german || 'Danke', transcription: shuffledOthers[0]?.transcription || '', isCorrect: false },
                    { text: shuffledOthers[1]?.german || 'Bitte', transcription: shuffledOthers[1]?.transcription || '', isCorrect: false }
                ].sort(() => 0.5 - Math.random());

                // Чередуем типы вопросов:
                if (idx % 2 === 0) {
                    challenges.push({
                        type: 'SELECT',
                        question: `Как сказать по-немецки: «${item.russian}»?`,
                        mascotText: `Вспомни правильное немецкое слово для: «${item.russian}»`,
                        options: options,
                        correctOptionText: item.german,
                        correctExplanation: `${item.german} — ${item.russian} ${item.transcription ? `(${item.transcription})` : ''}`
                    });
                } else {
                    challenges.push({
                        type: 'LISTEN',
                        question: `Прослушайте и выберите правильный перевод слова: «${item.german}»`,
                        mascotText: `Нажмите на динамик и выберите точный перевод`,
                        listenWord: item.german,
                        voiceHint: item.voice_hint || 'de-DE-KatjaNeural',
                        options: [
                            { text: item.russian, isCorrect: true },
                            { text: shuffledOthers[0]?.russian || 'Пожалуйста', isCorrect: false },
                            { text: shuffledOthers[1]?.russian || 'До свидания', isCorrect: false }
                        ].sort(() => 0.5 - Math.random()),
                        correctOptionText: item.russian,
                        correctExplanation: `${item.german} — это «${item.russian}»`
                    });
                }
            });
        }

        // 2. Ситуационный вопрос из тренажера диалога
        if (lesson.dialogue_simulator) {
            challenges.push({
                type: 'DIALOGUE',
                question: `Ситуация в Германии: ${lesson.dialogue_simulator.situation}`,
                mascotText: `Какая фраза лучше всего подходит в этой ситуации?`,
                options: [
                    { text: lesson.dialogue_simulator.example, isCorrect: true },
                    { text: 'Entschuldigung, ich weiß es nicht.', isCorrect: false },
                    { text: 'Nein, danke, alles gut.', isCorrect: false }
                ].sort(() => 0.5 - Math.random()),
                correctOptionText: lesson.dialogue_simulator.example,
                correctExplanation: `💡 Подсказка: ${lesson.dialogue_simulator.tips}`
            });
        }

        return challenges;
    }

    render() {
        const container = document.getElementById('lingoAppContainer');
        if (!container) return;

        if (this.currentChallengeIndex >= this.currentChallenges.length) {
            this.renderVictoryScreen(container);
            return;
        }

        const challenge = this.currentChallenges[this.currentChallengeIndex];
        const progressPercent = Math.round((this.currentChallengeIndex / this.currentChallenges.length) * 100);

        container.innerHTML = `
            <div class="flex flex-col h-full max-w-2xl mx-auto w-full select-none bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <!-- 1. HEADER (Lingo Header: Cross, Progress Bar, Hearts, XP) -->
                <header class="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-3 sm:gap-6 border-b border-slate-100">
                    <button onclick="exitLingoModal()" class="text-slate-400 hover:text-slate-600 transition p-1 text-xl font-bold" title="Выйти">
                        ✕
                    </button>
                    
                    <!-- Progress bar -->
                    <div class="flex-1 bg-slate-100 h-3.5 rounded-full overflow-hidden relative border border-slate-200/60">
                        <div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%;">
                            <div class="h-1 bg-emerald-400/60 rounded-full mx-1 mt-0.5"></div>
                        </div>
                    </div>

                    <!-- Hearts -->
                    <div class="flex items-center gap-1.5 text-rose-500 font-extrabold text-sm sm:text-base">
                        <img src="/static/duolingo/heart.svg" class="w-6 h-6 animate-pulse" alt="Hearts">
                        <span>${this.hearts}</span>
                    </div>

                    <!-- XP Points -->
                    <div class="flex items-center gap-1 text-amber-500 font-extrabold text-xs sm:text-sm bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                        <img src="/static/duolingo/points.svg" class="w-4 h-4" alt="XP">
                        <span>${this.xp} XP</span>
                    </div>
                </header>

                <!-- 2. QUIZ BODY (Mascot Bubble & Question) -->
                <main class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between">
                    <div>
                        <!-- Mascot Speech Bubble (1:1 Duolingo Style) -->
                        <div class="flex items-start gap-3 sm:gap-4 mb-6">
                            <img src="${this.status === 'wrong' ? '/static/duolingo/mascot_sad.svg' : '/static/duolingo/mascot.svg'}" 
                                 class="w-14 h-14 sm:w-16 sm:h-16 shrink-0 transition-all duration-200" alt="Mascot">
                            
                            <div class="relative bg-white border-2 border-slate-200 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm font-bold text-slate-800 shadow-sm flex-1">
                                <!-- Bubble arrow pointer -->
                                <div class="absolute -left-2 top-4 w-3 h-3 bg-white border-l-2 border-b-2 border-slate-200 rotate-45"></div>
                                <p>${escapeHtml(challenge.mascotText)}</p>
                                
                                ${challenge.type === 'LISTEN' ? `
                                    <button onclick="playTTS(this, '${escapeQuotes(challenge.listenWord)}', '${challenge.voiceHint}')" class="mt-2 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 border-b-4 border-sky-600 active:border-b-0 transition shadow-sm">
                                        🔊 Прослушать слово «${escapeHtml(challenge.listenWord)}»
                                    </button>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Question Title -->
                        <h2 class="text-base sm:text-lg font-extrabold text-slate-800 mb-4">
                            ${escapeHtml(challenge.question)}
                        </h2>

                        <!-- 3. CHALLENGE CARDS (Chunky 3D Duolingo Buttons) -->
                        <div class="grid grid-cols-1 gap-3">
                            ${challenge.options.map((opt, idx) => {
                                let cardStyle = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 border-2 border-b-4 active:border-b-2";
                                if (this.selectedOptionIndex === idx) {
                                    cardStyle = "border-sky-400 bg-sky-50 text-sky-700 border-2 border-b-4 active:border-b-2 ring-2 ring-sky-300";
                                }
                                if (this.status === 'correct' && opt.isCorrect) {
                                    cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                                }
                                if (this.status === 'wrong') {
                                    if (this.selectedOptionIndex === idx) {
                                        cardStyle = "border-rose-500 bg-rose-50 text-rose-800 border-2 border-b-4";
                                    } else if (opt.isCorrect) {
                                        cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                                    }
                                }

                                return `
                                    <div onclick="lingoEngine.selectOption(${idx})" 
                                         class="rounded-2xl p-4 sm:p-4 cursor-pointer transition-all duration-150 flex items-center justify-between ${cardStyle}">
                                        <div class="flex items-center gap-3">
                                            <span class="w-6 h-6 rounded-lg border-2 border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500">
                                                ${idx + 1}
                                            </span>
                                            <div>
                                                <span class="font-bold text-sm sm:text-base">${escapeHtml(opt.text)}</span>
                                                ${opt.transcription ? `<span class="text-rose-500 font-mono text-xs block sm:inline sm:ml-2">[${escapeHtml(opt.transcription)}]</span>` : ''}
                                            </div>
                                        </div>
                                        ${opt.audioSrc ? `
                                            <button onclick="event.stopPropagation(); playTTS(this, '${escapeQuotes(opt.text)}', '${opt.voiceHint}')" class="text-slate-400 hover:text-sky-500 p-1 text-base">
                                                🔊
                                            </button>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </main>

                <!-- 4. FOOTER (Chunky Check / Continue Button with Success / Wrong State) -->
                ${this.renderFooter(challenge)}
            </div>
        `;
    }

    renderFooter(challenge) {
        if (this.status === 'none') {
            const isSelected = this.selectedOptionIndex !== null;
            return `
                <footer class="p-4 sm:p-5 border-t border-slate-200 bg-white flex items-center justify-end">
                    <button onclick="lingoEngine.checkAnswer()" 
                            ${!isSelected ? 'disabled' : ''}
                            class="w-full sm:w-auto px-8 py-3 rounded-2xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-sm
                                   ${isSelected ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-600 active:border-b-0 cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-b-4 border-slate-300'}">
                        Проверить
                    </button>
                </footer>
            `;
        }

        if (this.status === 'correct') {
            return `
                <footer class="p-4 sm:p-5 border-t-2 border-emerald-300 bg-emerald-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                    <div class="flex items-center gap-3 text-emerald-800">
                        <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-sm">
                            ✓
                        </div>
                        <div>
                            <h4 class="font-extrabold text-base">Великолепно, Алина! ✨</h4>
                            <p class="text-xs text-emerald-700 font-medium">${escapeHtml(challenge.correctExplanation)}</p>
                        </div>
                    </div>
                    <button onclick="lingoEngine.nextChallenge()" 
                            class="w-full sm:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider border-b-4 border-emerald-600 active:border-b-0 transition shadow-sm">
                        Далее ➔
                    </button>
                </footer>
            `;
        }

        if (this.status === 'wrong') {
            return `
                <footer class="p-4 sm:p-5 border-t-2 border-rose-300 bg-rose-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                    <div class="flex items-center gap-3 text-rose-800">
                        <div class="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-sm">
                            ✕
                        </div>
                        <div>
                            <h4 class="font-extrabold text-base">Правильный ответ:</h4>
                            <p class="text-xs sm:text-sm text-rose-900 font-bold">${escapeHtml(challenge.correctOptionText)}</p>
                            <p class="text-[11px] text-rose-700">${escapeHtml(challenge.correctExplanation)}</p>
                        </div>
                    </div>
                    <button onclick="lingoEngine.nextChallenge()" 
                            class="w-full sm:w-auto px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider border-b-4 border-rose-600 active:border-b-0 transition shadow-sm">
                        Понятно ➔
                    </button>
                </footer>
            `;
        }
    }

    selectOption(index) {
        if (this.status !== 'none') return;
        this.selectedOptionIndex = index;
        this.render();
    }

    checkAnswer() {
        if (this.selectedOptionIndex === null || this.status !== 'none') return;

        const challenge = this.currentChallenges[this.currentChallengeIndex];
        const selected = challenge.options[this.selectedOptionIndex];

        if (selected && selected.isCorrect) {
            this.status = 'correct';
            this.xp += 10;
            localStorage.setItem('lingo_xp', this.xp);
            this.playSound('correct');
        } else {
            this.status = 'wrong';
            this.hearts = Math.max(0, this.hearts - 1);
            localStorage.setItem('lingo_hearts', this.hearts);
            this.playSound('incorrect');

            if (this.hearts === 0) {
                setTimeout(() => {
                    alert('💔 Закончились сердечки! Коуч восполняет ваши силы до 5 ❤️. Продолжайте спокойно!');
                    this.hearts = 5;
                    localStorage.setItem('lingo_hearts', 5);
                    this.render();
                }, 1000);
            }
        }

        this.render();
        this.syncProgressWithSupabase();
    }

    nextChallenge() {
        this.status = 'none';
        this.selectedOptionIndex = null;
        this.currentChallengeIndex++;
        this.render();
    }

    renderVictoryScreen(container) {
        this.playSound('finish');
        this.streak = Math.min(30, this.streak + 1);
        localStorage.setItem('lingo_streak', this.streak);

        // Конфетти при победе
        if (window.confetti) {
            window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto h-full space-y-6 bg-white rounded-2xl shadow-xl border border-slate-200">
                <img src="/static/duolingo/finish.svg" class="w-32 h-32 animate-bounce" alt="Victory">
                
                <div>
                    <h2 class="text-2xl font-black text-slate-800">Урок успешно завершен! 🎉</h2>
                    <p class="text-slate-500 text-sm mt-1">Отличная работа, дорогая Алина! Твой немецкий растёт с каждым днём.</p>
                </div>

                <!-- Карточки результатов (XP & Streak) -->
                <div class="grid grid-cols-2 gap-3 w-full">
                    <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col items-center">
                        <span class="text-xs font-bold text-amber-700 uppercase">Опыт</span>
                        <div class="flex items-center gap-1.5 text-xl font-extrabold text-amber-900 mt-1">
                            <img src="/static/duolingo/points.svg" class="w-5 h-5">
                            <span>+50 XP</span>
                        </div>
                    </div>
                    
                    <div class="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col items-center">
                        <span class="text-xs font-bold text-rose-700 uppercase">Серия дней</span>
                        <div class="flex items-center gap-1.5 text-xl font-extrabold text-rose-900 mt-1">
                            <span>🔥</span>
                            <span>${this.streak} дн.</span>
                        </div>
                    </div>
                </div>

                <div class="w-full space-y-2 pt-2">
                    <button onclick="talkToCoachForLesson(${this.currentLessonId})" 
                            class="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider border-b-4 border-purple-800 active:border-b-0 transition shadow-md flex items-center justify-center gap-2">
                        <span>💬 Этап 4: Ролевой диалог с ИИ-коучем ➔</span>
                    </button>
                    <button onclick="lingoEngine.startLesson(${this.currentLessonId + 1}, (typeof allGermanCourseData !== 'undefined' ? allGermanCourseData.lessons : []))" 
                            class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider border-b-4 border-emerald-600 active:border-b-0 transition shadow-md">
                        Следующий Duolingo урок ➔
                    </button>
                    <button onclick="setGermanViewMode('lessons')" 
                            class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition">
                        🎯 Вернуться к плану дня
                    </button>
                </div>
            </div>
        `;
    }

    async syncProgressWithSupabase() {
        try {
            await fetch('/api/german/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    xp: this.xp,
                    hearts: this.hearts,
                    streak: this.streak,
                    lesson_id: this.currentLessonId
                })
            });
        } catch(e) {}
    }
}

window.lingoEngine = new LingoGameEngine();
var lingoEngine = window.lingoEngine;

function exitLingoModal() {
    if (confirm('Вы уверены, что хотите прервать урок? Прогресс урока не сохранится.')) {
        setGermanViewMode('lessons');
    }
}
