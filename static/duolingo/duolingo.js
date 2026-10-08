// =========================================================================
// Lingo (Duolingo Clone Engine 2.0) — Полноценный движок Duolingo для Алины
// =========================================================================
// Включает:
// 1. Интерактивную карту обучения (The Learning Path) с змейкой уровней и совой
// 2. Механику Word Bank (сбор предложений из слов с контролем порядка слов)
// 3. Механику Match Pairs (соединение пар слов)
// 4. Механику Listening (аудирование с нормальной и замедленной скоростью 🐢)
// 5. Умный подбор дистракторов (без спойлеров и без динамиков у вариантов)
// 6. Справочник грамматики юнитов (Unit Guidebook)
// 7. Аутентичные звуки (correct.wav, incorrect.wav, finish.mp3) и ассеты совы
// =========================================================================

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
        this.completedLessons = JSON.parse(localStorage.getItem('lingo_completed_lessons') || '[]');
        this.currentLessonId = parseInt(localStorage.getItem('ai_coach_german_day') || '1', 10);
        this.currentChallenges = [];
        this.currentChallengeIndex = 0;
        this.selectedOptionIndex = null;
        this.status = 'none'; // 'none' | 'correct' | 'wrong' | 'completed'

        // Состояния для интерактивных типов заданий
        this.wordBankSelected = []; // [{ id, text }]
        this.wordBankAvailable = []; // [{ id, text }]
        this.pairsSelectedFirst = null; // { id, side, value, pairId }
        this.matchedPairsCount = 0;

        // Предзагрузка звуков
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

    // =========================================================================
    // 1. ГЕНЕРАЦИЯ УМНЫХ ДИСТРАКТОРОВ (БЕЗ СПОЙЛЕРОВ)
    // =========================================================================
    getSmartDistractors(targetText, allLessons, count = 2, isGerman = true) {
        const pool = [];
        const targetClean = (targetText || '').trim().toLowerCase();
        const targetLen = targetClean.split(/\s+/).length;

        // Фильтр отсеивания любых артефактов и заглушек
        const isValidCandidate = (str) => {
            if (!str || typeof str !== 'string') return false;
            const s = str.trim();
            if (s.length < 2 || s.toLowerCase() === targetClean) return false;
            if (s.includes('_') || /Fachwort|Ausdruck|День\s*\d|Термин|Beispiel/i.test(s)) return false;
            if (/^\d+$/.test(s) || s.startsWith('[')) return false;
            return true;
        };

        allLessons.forEach(l => {
            (l.vocabulary || []).forEach(v => {
                const text = isGerman ? v.german : v.russian;
                if (isValidCandidate(text) && !pool.includes(text)) {
                    const len = text.trim().split(/\s+/).length;
                    // Подбираем фразы схожей длины (по числу слов ±3), чтобы не палить правильный ответ
                    if (Math.abs(len - targetLen) <= 3) {
                        pool.push(text);
                    }
                }
            });
        });

        // Качественные естественные варианты на случай редких/новых уроков
        const germanFallbacks = [
            'Ich verstehe das leider nicht.',
            'Können Sie das bitte wiederholen?',
            'Das ist für mich sehr wichtig.',
            'Ich lerne jeden Tag fleißig Deutsch.',
            'Wir sprechen über unsere Pläne.',
            'Ich möchte mich gerne verbessern.'
        ].filter(f => f.toLowerCase() !== targetClean);

        const russianFallbacks = [
            'Я пока не могу точно сказать.',
            'Мы можем обсудить это чуть позже.',
            'Мне нужно немного времени подумать.',
            'Это имеет большое значение для меня.',
            'Я стараюсь говорить уверенно.'
        ].filter(f => f.toLowerCase() !== targetClean);

        const fallbacks = isGerman ? germanFallbacks : russianFallbacks;

        // Перемешиваем и добираем при необходимости
        const shuffled = pool.sort(() => 0.5 - Math.random());
        while (shuffled.length < count && fallbacks.length > 0) {
            const nextFb = fallbacks.pop();
            if (!shuffled.includes(nextFb)) shuffled.push(nextFb);
        }

        return shuffled.slice(0, count);
    }

    // =========================================================================
    // 2. ГЕНЕРАЦИЯ ЗАДАНИЙ УРОКА (5 РАЗНООБРАЗНЫХ ТИПОВ)
    // =========================================================================
    generateChallenges(lesson, allLessons) {
        const challenges = [];
        const vocab = lesson.vocabulary || [];

        // 1. ТИП: MATCH PAIRS (Соедини 4 пары слов в начале урока для разминки)
        if (vocab.length >= 4) {
            const pairSlice = vocab.slice(0, 4);
            const leftCards = pairSlice.map((v, idx) => ({ id: `L_${idx}`, pairId: idx, side: 'de', text: v.german, voiceHint: v.voice_hint }));
            const rightCards = pairSlice.map((v, idx) => ({ id: `R_${idx}`, pairId: idx, side: 'ru', text: v.russian }));

            challenges.push({
                type: 'MATCH_PAIRS',
                question: 'Соедините немецкие слова с их правильным переводом:',
                mascotText: 'Найди пары слов для быстрой разминки!',
                cards: [...leftCards, ...rightCards].sort(() => 0.5 - Math.random()),
                totalPairs: 4
            });
        }

        // 2. ТИП: WORD BANK (Собери фразу из слов — тренировка порядка слов)
        if (vocab.length > 0) {
            const item1 = vocab[0];
            const cleanGerman = item1.german.replace(/[.!?]/g, '').trim();
            let words = cleanGerman.split(/\s+/);
            let targetSentence = cleanGerman;
            let questionRu = item1.russian;
            let correctFull = item1.german;

            // Если фраза короткая (< 3 слов) и есть хороший пример из 3-8 слов — тренируем полноценное предложение
            if (words.length < 3 && item1.example) {
                const exClean = item1.example.replace(/[.!?]/g, '').trim();
                const exWords = exClean.split(/\s+/);
                if (exWords.length >= 3 && exWords.length <= 8) {
                    words = exWords;
                    targetSentence = exClean;
                    questionRu = item1.example_translation || item1.russian;
                    correctFull = item1.example;
                }
            }
            
            // 2 дистрактора из того же урока
            const otherWords = vocab.slice(1).flatMap(v => (v.example || v.german).replace(/[.!?]/g, '').split(/\s+/)).filter(w => !words.includes(w));
            const extraWords = [...new Set(otherWords)].slice(0, 2);

            const allTokens = [...words, ...extraWords].map((word, idx) => ({
                id: `wb_${idx}_${word}`,
                text: word
            })).sort(() => 0.5 - Math.random());

            challenges.push({
                type: 'WORD_BANK',
                question: `Соберите фразу: «${questionRu}»`,
                mascotText: 'Вспомни железный порядок слов: глагол на 2-м месте в главном предложении!',
                targetSentence: targetSentence,
                correctFull: correctFull,
                voiceHint: item1.voice_hint || 'de-DE-KatjaNeural',
                tokens: allTokens,
                correctExplanation: `Правильно: ${correctFull} ${item1.transcription ? `(${item1.transcription})` : ''}`
            });
        }

        // 3. ТИП: SMART SELECT (Осмысленный выбор немецкого перевода БЕЗ динамиков и спойлеров)
        if (vocab.length > 1) {
            const item2 = vocab[1];
            const distractors = this.getSmartDistractors(item2.german, allLessons, 2, true);

            const options = [
                { text: item2.german, isCorrect: true, voiceHint: item2.voice_hint },
                { text: distractors[0] || 'Ich verstehe das nicht ganz.', isCorrect: false },
                { text: distractors[1] || 'Können Sie das bitte wiederholen?', isCorrect: false }
            ].sort(() => 0.5 - Math.random());

            challenges.push({
                type: 'SELECT',
                question: `Как правильно сказать по-немецки: «${item2.russian}»?`,
                mascotText: 'Выбери грамматически верный вариант:',
                options: options,
                correctOptionText: item2.german,
                voiceHint: item2.voice_hint || 'de-DE-KatjaNeural',
                correctExplanation: `${item2.german} — ${item2.russian} ${item2.transcription ? `(${item2.transcription})` : ''}`
            });
        }

        // 4. ТИП: LISTENING (Аудирование с нейро-голосом Katja/Conrad)
        if (vocab.length > 2) {
            const item3 = vocab[2];
            const distractorsRu = this.getSmartDistractors(item3.russian, allLessons, 2, false);

            const options = [
                { text: item3.russian, isCorrect: true },
                { text: distractorsRu[0] || 'Я пока не готова ответить на этот вопрос', isCorrect: false },
                { text: distractorsRu[1] || 'Мы можем обсудить это позже', isCorrect: false }
            ].sort(() => 0.5 - Math.random());

            challenges.push({
                type: 'LISTEN',
                question: 'Прослушайте немецкую речь и выберите точный смысл:',
                mascotText: 'Нажмите на динамик, чтобы прослушать фразу',
                listenText: item3.german,
                voiceHint: item3.voice_hint || 'de-DE-KatjaNeural',
                options: options,
                correctOptionText: item3.russian,
                correctExplanation: `${item3.german} означает «${item3.russian}»`
            });
        }

        // 5. ТИП: WORD BANK 2 (Вторая фраза на закрепление структуры)
        if (vocab.length > 3) {
            const item4 = vocab[3];
            const cleanGerman = item4.german.replace(/[.!?]/g, '').trim();
            let words = cleanGerman.split(/\s+/);
            let targetSentence = cleanGerman;
            let questionRu = item4.russian;
            let correctFull = item4.german;

            if (words.length < 3 && item4.example) {
                const exClean = item4.example.replace(/[.!?]/g, '').trim();
                const exWords = exClean.split(/\s+/);
                if (exWords.length >= 3 && exWords.length <= 8) {
                    words = exWords;
                    targetSentence = exClean;
                    questionRu = item4.example_translation || item4.russian;
                    correctFull = item4.example;
                }
            }

            const otherWords = vocab.slice(0, 3).flatMap(v => (v.example || v.german).replace(/[.!?]/g, '').split(/\s+/)).filter(w => !words.includes(w));
            const extraWords = [...new Set(otherWords)].slice(0, 2);

            const allTokens = [...words, ...extraWords].map((word, idx) => ({
                id: `wb2_${idx}_${word}`,
                text: word
            })).sort(() => 0.5 - Math.random());

            challenges.push({
                type: 'WORD_BANK',
                question: `Соберите фразу: «${questionRu}»`,
                mascotText: 'Собери предложение из плашек в правильном порядке:',
                targetSentence: targetSentence,
                correctFull: correctFull,
                voiceHint: item4.voice_hint || 'de-DE-ConradNeural',
                tokens: allTokens,
                correctExplanation: `Отлично! ${correctFull} (${questionRu})`
            });
        }

        // 6. ТИП: DIALOGUE SIMULATOR (Реальная ситуация в Германии)
        if (lesson.dialogue_simulator) {
            const currentEx = lesson.dialogue_simulator.example;
            const otherDialogueExamples = (allLessons || [])
                .filter(l => l.dialogue_simulator && l.dialogue_simulator.example && l.dialogue_simulator.example !== currentEx)
                .map(l => l.dialogue_simulator.example);
            
            const shuffledOther = [...new Set(otherDialogueExamples)].sort(() => 0.5 - Math.random());
            const dist1 = shuffledOther[0] || 'Könnten Sie mir bitte später dabei behilflich sein?';
            const dist2 = shuffledOther[1] || 'Entschuldigung, ich muss das kurz nachsehen.';

            challenges.push({
                type: 'DIALOGUE',
                question: `Ситуация в Германии: ${lesson.dialogue_simulator.situation}`,
                mascotText: 'Что лучше всего сказать в этой ситуации?',
                options: [
                    { text: currentEx, isCorrect: true, voiceHint: 'de-DE-KatjaNeural' },
                    { text: dist1, isCorrect: false },
                    { text: dist2, isCorrect: false }
                ].sort(() => 0.5 - Math.random()),
                correctOptionText: currentEx,
                voiceHint: 'de-DE-KatjaNeural',
                correctExplanation: `💡 Совет коуча: ${lesson.dialogue_simulator.tips}`
            });
        }

        // 7. ТИП: ARTICLE QUIZ (Определение рода и артикля der/die/das)
        const nounsWithArticles = vocab.filter(v => v.article && ['der', 'die', 'das'].includes(v.article.toLowerCase()));
        if (nounsWithArticles.length > 0) {
            nounsWithArticles.slice(0, 2).forEach((noun, nIdx) => {
                const cleanWord = noun.german.replace(/^(der|die|das)\s+/i, '').trim();
                const correctArt = noun.article.toLowerCase();
                challenges.push({
                    type: 'SELECT',
                    question: `Какой артикль у слова «${cleanWord}» (${noun.russian})?`,
                    mascotText: 'В немецком род существительного нужно запоминать вместе со словом!',
                    options: [
                        { text: `der ${cleanWord} (мужской род)`, isCorrect: correctArt === 'der', voiceHint: 'de-DE-KatjaNeural' },
                        { text: `die ${cleanWord} (женский род)`, isCorrect: correctArt === 'die', voiceHint: 'de-DE-KatjaNeural' },
                        { text: `das ${cleanWord} (средний род)`, isCorrect: correctArt === 'das', voiceHint: 'de-DE-KatjaNeural' }
                    ],
                    correctOptionText: `${correctArt} ${cleanWord} (${correctArt === 'der' ? 'мужской' : correctArt === 'die' ? 'женский' : 'средний'} род)`,
                    voiceHint: noun.voice_hint || 'de-DE-KatjaNeural',
                    correctExplanation: `Верно! ${noun.article} ${cleanWord} — ${noun.russian}. ${noun.example ? `Пример: ${noun.example}` : ''}`
                });
            });
        }

        // 8. ТИП: SECOND MATCH PAIRS (Закрепление расширенного словарного запаса)
        if (vocab.length >= 8) {
            const pairSlice2 = vocab.slice(4, 8);
            const leftCards2 = pairSlice2.map((v, idx) => ({ id: `L2_${idx}`, pairId: idx + 10, side: 'de', text: v.german, voiceHint: v.voice_hint }));
            const rightCards2 = pairSlice2.map((v, idx) => ({ id: `R2_${idx}`, pairId: idx + 10, side: 'ru', text: v.russian }));

            challenges.push({
                type: 'MATCH_PAIRS',
                question: 'Закрепление слов: соедините пары слов:',
                mascotText: 'Отлично справляешься! Соедини оставшиеся слова урока:',
                cards: [...leftCards2, ...rightCards2].sort(() => 0.5 - Math.random()),
                totalPairs: 4
            });
        }

        return challenges;
    }

    // =========================================================================
    // 3. СТАРТ УРОКА И ИНИЦИАЛИЗАЦИЯ
    // =========================================================================
    async startLesson(lessonId, lessonsData) {
        this.currentLessonId = lessonId || 1;
        this.selectedOptionIndex = null;
        this.status = 'none';
        this.currentChallengeIndex = 0;
        this.wordBankSelected = [];
        this.wordBankAvailable = [];
        this.pairsSelectedFirst = null;
        this.matchedPairsCount = 0;

        if (!lessonsData || !lessonsData.length) {
            try {
                const res = await fetch('/api/german/course');
                const data = await res.json();
                lessonsData = data.lessons || [];
                window.allGermanCourseData = data;
            } catch(e) {
                lessonsData = [];
            }
        }

        const lesson = (lessonsData && lessonsData.length > 0) 
            ? (lessonsData.find(l => (l.id == this.currentLessonId || l.day == this.currentLessonId)) || lessonsData[0]) 
            : null;

        if (!lesson) {
            alert('Урок не найден');
            return;
        }

        this.currentLessonData = lesson;
        this.currentChallenges = this.generateChallenges(lesson, lessonsData);

        // Переключаем контейнеры в интерфейсе (Полноэкранный режим игры 100% viewport)
        const lingoContainer = document.getElementById('lingoAppContainer');
        if (lingoContainer) {
            lingoContainer.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
            this.initChallengeState();
            this.render();
        }
    }

    initChallengeState() {
        this.status = 'none';
        this.selectedOptionIndex = null;
        this.pairsSelectedFirst = null;
        this.matchedPairsCount = 0;

        const ch = this.currentChallenges[this.currentChallengeIndex];
        if (!ch) return;

        if (ch.type === 'WORD_BANK') {
            this.wordBankSelected = [];
            this.wordBankAvailable = [...ch.tokens];
        } else if (ch.type === 'MATCH_PAIRS') {
            ch.cards.forEach(c => c.matched = false);
        }
    }

    // =========================================================================
    // 4. ГЛАВНЫЙ РЕНДЕР ИГРОВОГО ЭКРАНА DUOLINGO (ПОЛНОЭКРАННЫЙ РЕЖИМ)
    // =========================================================================
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
            <div class="flex flex-col h-full w-full select-none bg-white overflow-hidden">
                <!-- 1. HEADER (Lingo Fullscreen Header: Cross, Progress, Hearts, XP) -->
                <header class="px-4 sm:px-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 flex items-center justify-between gap-3 sm:gap-6 border-b border-slate-100 bg-white shrink-0">
                    <button onclick="lingoEngine.exitQuiz()" class="text-slate-400 hover:text-slate-700 active:scale-95 transition p-2 -ml-2 text-2xl font-bold flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100" title="Выйти к карте уроков">
                        ✕
                    </button>
                    
                    <!-- Progress bar -->
                    <div class="flex-1 bg-slate-100 h-4 rounded-full overflow-hidden relative border border-slate-200/80">
                        <div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width: ${progressPercent}%;">
                            <div class="h-1 bg-emerald-300/70 rounded-full mx-1.5 mt-0.5"></div>
                        </div>
                    </div>

                    <!-- Hearts -->
                    <div onclick="lingoEngine.openHeartRefillModal()" class="flex items-center gap-1.5 text-rose-500 font-black text-sm sm:text-base cursor-pointer hover:scale-105 transition" title="Сердечки">
                        <img src="/static/duolingo/heart.svg" class="w-6 h-6 animate-pulse" alt="Hearts">
                        <span>${this.hearts}</span>
                    </div>

                    <!-- XP Points -->
                    <div class="flex items-center gap-1 text-amber-500 font-extrabold text-xs sm:text-sm bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
                        <img src="/static/duolingo/points.svg" class="w-4 h-4" alt="XP">
                        <span>${this.xp} XP</span>
                    </div>
                </header>

                <!-- 2. QUIZ BODY (Mascot Bubble & Challenge Content) -->
                <main class="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col justify-between max-w-xl mx-auto w-full">
                    <div>
                        <!-- Mascot Speech Bubble -->
                        <div class="flex items-start gap-3 sm:gap-4 mb-5">
                            <img src="${this.status === 'wrong' ? '/static/duolingo/mascot_sad.svg' : '/static/duolingo/mascot.svg'}" 
                                 class="w-14 h-14 sm:w-16 sm:h-16 shrink-0 transition-all duration-200" alt="Duolingo Owl">
                            
                            <div class="relative bg-white border-2 border-slate-200 rounded-2xl p-3.5 shadow-sm text-slate-700 text-xs sm:text-sm font-semibold max-w-md">
                                <div class="absolute -left-2 top-4 w-3 h-3 bg-white border-l-2 border-b-2 border-slate-200 rotate-45"></div>
                                ${escapeHtml(challenge.mascotText)}
                            </div>
                        </div>

                        <!-- Question title -->
                        <h2 class="text-base sm:text-lg font-black text-slate-800 mb-4">
                            ${escapeHtml(challenge.question)}
                        </h2>

                        <!-- Dynamic Challenge Body -->
                        ${this.renderChallengeContent(challenge)}
                    </div>
                </main>

                <!-- 3. FOOTER (Action Button & Result Feedback) -->
                ${this.renderFooter(challenge)}
            </div>
        `;
    }

    renderChallengeContent(challenge) {
        if (challenge.type === 'WORD_BANK') {
            return this.renderWordBankContent(challenge);
        } else if (challenge.type === 'MATCH_PAIRS') {
            return this.renderMatchPairsContent(challenge);
        } else if (challenge.type === 'LISTEN') {
            return this.renderListenContent(challenge);
        } else {
            // SELECT or DIALOGUE
            return this.renderSelectContent(challenge);
        }
    }

    // =========================================================================
    // 5. РЕНДЕР И ЛОГИКА WORD BANK (СБОР ПРЕДЛОЖЕНИЯ)
    // =========================================================================
    renderWordBankContent(challenge) {
        const isLocked = this.status !== 'none';
        return `
            <div class="space-y-6">
                <!-- Answer Construction Line (Куда встают выбранные слова) -->
                <div class="min-h-[64px] p-3 bg-slate-50 border-b-2 border-slate-300 rounded-xl flex flex-wrap gap-2 items-center">
                    ${this.wordBankSelected.length === 0 ? '<span class="text-xs text-slate-400 italic">Нажимайте на слова внизу, чтобы собрать фразу...</span>' : ''}
                    ${this.wordBankSelected.map((token, idx) => `
                        <button onclick="${!isLocked ? `lingoEngine.returnWordBankToken('${token.id}')` : ''}"
                                class="px-3 py-2 bg-white text-slate-800 border-2 border-b-4 border-slate-300 active:border-b-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition hover:bg-slate-100">
                            ${escapeHtml(token.text)}
                        </button>
                    `).join('')}
                </div>

                <!-- Word Bank Tokens (Доступные слова в банке) -->
                <div class="flex flex-wrap gap-2 justify-center pt-2">
                    ${this.wordBankAvailable.map((token) => `
                        <button onclick="${!isLocked ? `lingoEngine.selectWordBankToken('${token.id}')` : ''}"
                                class="px-3.5 py-2.5 bg-white text-slate-800 border-2 border-b-4 border-slate-300 active:border-b-2 rounded-xl text-xs sm:text-sm font-bold shadow-sm transition hover:border-sky-400 hover:text-sky-700">
                            ${escapeHtml(token.text)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    selectWordBankToken(tokenId) {
        if (this.status !== 'none') return;
        const idx = this.wordBankAvailable.findIndex(t => t.id === tokenId);
        if (idx !== -1) {
            const token = this.wordBankAvailable.splice(idx, 1)[0];
            this.wordBankSelected.push(token);
            this.render();
        }
    }

    returnWordBankToken(tokenId) {
        if (this.status !== 'none') return;
        const idx = this.wordBankSelected.findIndex(t => t.id === tokenId);
        if (idx !== -1) {
            const token = this.wordBankSelected.splice(idx, 1)[0];
            this.wordBankAvailable.push(token);
            this.render();
        }
    }

    // =========================================================================
    // 6. РЕНДЕР И ЛОГИКА MATCH PAIRS (СОЕДИНИ ПАРЫ)
    // =========================================================================
    renderMatchPairsContent(challenge) {
        return `
            <div class="grid grid-cols-2 gap-3">
                ${challenge.cards.map((card) => {
                    const isSelected = this.pairsSelectedFirst && this.pairsSelectedFirst.id === card.id;
                    let style = 'bg-white border-2 border-b-4 border-slate-200 text-slate-700 hover:bg-slate-50';
                    if (card.matched) {
                        style = 'bg-slate-100 border-2 border-slate-200 text-slate-300 cursor-not-allowed opacity-60';
                    } else if (isSelected) {
                        style = 'bg-sky-50 border-2 border-b-4 border-sky-400 text-sky-700 ring-2 ring-sky-300';
                    }

                    return `
                        <button onclick="${!card.matched ? `lingoEngine.onPairCardClick('${card.id}')` : ''}"
                                class="p-3.5 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-150 text-center ${style}">
                            ${escapeHtml(card.text)}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    onPairCardClick(cardId) {
        const challenge = this.currentChallenges[this.currentChallengeIndex];
        const card = challenge.cards.find(c => c.id === cardId);
        if (!card || card.matched) return;

        // Воспроизводим немецкий звук при клике на немецкую карточку
        if (card.side === 'de' && card.voiceHint && typeof playTTS === 'function') {
            playTTS(null, card.text, card.voiceHint);
        }

        if (!this.pairsSelectedFirst) {
            this.pairsSelectedFirst = card;
            this.render();
            return;
        }

        // Кликнули на ту же самую карточку — снимаем выбор
        if (this.pairsSelectedFirst.id === card.id) {
            this.pairsSelectedFirst = null;
            this.render();
            return;
        }

        // Проверяем пару
        if (this.pairsSelectedFirst.pairId === card.pairId && this.pairsSelectedFirst.side !== card.side) {
            // Успешная пара!
            this.pairsSelectedFirst.matched = true;
            card.matched = true;
            this.pairsSelectedFirst = null;
            this.matchedPairsCount++;
            this.playSound('correct');

            if (this.matchedPairsCount >= challenge.totalPairs) {
                this.status = 'correct';
                this.xp += 15;
                localStorage.setItem('lingo_xp', this.xp);
            }
            this.render();
        } else {
            // Ошибка — сбрасываем выбор
            this.playSound('incorrect');
            this.pairsSelectedFirst = null;
            this.render();
        }
    }

    // =========================================================================
    // 7. РЕНДЕР И ЛОГИКА LISTENING (АУДИРОВАНИЕ)
    // =========================================================================
    renderListenContent(challenge) {
        return `
            <div class="space-y-5">
                <!-- Большие кнопки воспроизведения речи -->
                <div class="flex items-center justify-center gap-4 py-2">
                    <button onclick="playTTS(this, '${escapeQuotes(challenge.listenText)}', '${challenge.voiceHint}')"
                            class="w-16 h-16 sm:w-20 sm:h-20 bg-sky-500 hover:bg-sky-600 text-white rounded-3xl border-b-4 border-sky-600 active:border-b-0 shadow-lg flex items-center justify-center text-3xl transition transform active:scale-95"
                            title="Слушать нормально">
                        🔊
                    </button>
                    <button onclick="playTTS(this, '${escapeQuotes(challenge.listenText)}', '${challenge.voiceHint}')"
                            class="w-12 h-12 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-2xl border-b-2 border-amber-300 active:border-b-0 shadow-sm flex items-center justify-center text-xl transition"
                            title="Слушать медленно (черепашка)">
                        🐢
                    </button>
                </div>

                <!-- Варианты ответа (БЕЗ ДИНАМИКОВ И СПОЙЛЕРОВ) -->
                <div class="grid grid-cols-1 gap-3">
                    ${challenge.options.map((opt, idx) => {
                        let style = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 border-2 border-b-4 active:border-b-2";
                        if (this.selectedOptionIndex === idx) {
                            style = "border-sky-400 bg-sky-50 text-sky-700 border-2 border-b-4 active:border-b-2 ring-2 ring-sky-300";
                        }
                        if (this.status === 'correct' && opt.isCorrect) {
                            style = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                        }
                        if (this.status === 'wrong') {
                            if (this.selectedOptionIndex === idx) {
                                style = "border-rose-500 bg-rose-50 text-rose-800 border-2 border-b-4";
                            } else if (opt.isCorrect) {
                                style = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                            }
                        }

                        return `
                            <div onclick="lingoEngine.selectOption(${idx})" 
                                 class="rounded-2xl p-4 cursor-pointer transition-all duration-150 flex items-center justify-between ${style}">
                                <div class="flex items-center gap-3">
                                    <span class="w-6 h-6 rounded-lg border-2 border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500">
                                        ${idx + 1}
                                    </span>
                                    <span class="font-bold text-sm sm:text-base">${escapeHtml(opt.text)}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // =========================================================================
    // 8. РЕНДЕР И ЛОГИКА SELECT & DIALOGUE (БЕЗ СПОЙЛЕРОВ И ДИНАМИКОВ)
    // =========================================================================
    renderSelectContent(challenge) {
        return `
            <div class="grid grid-cols-1 gap-3">
                ${challenge.options.map((opt, idx) => {
                    let style = "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 border-2 border-b-4 active:border-b-2";
                    if (this.selectedOptionIndex === idx) {
                        style = "border-sky-400 bg-sky-50 text-sky-700 border-2 border-b-4 active:border-b-2 ring-2 ring-sky-300";
                    }
                    if (this.status === 'correct' && opt.isCorrect) {
                        style = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                    }
                    if (this.status === 'wrong') {
                        if (this.selectedOptionIndex === idx) {
                            style = "border-rose-500 bg-rose-50 text-rose-800 border-2 border-b-4";
                        } else if (opt.isCorrect) {
                            style = "border-emerald-500 bg-emerald-50 text-emerald-800 border-2 border-b-4";
                        }
                    }

                    return `
                        <div onclick="lingoEngine.selectOption(${idx})" 
                             class="rounded-2xl p-4 cursor-pointer transition-all duration-150 flex items-center justify-between ${style}">
                            <div class="flex items-center gap-3">
                                <span class="w-6 h-6 rounded-lg border-2 border-slate-300 flex items-center justify-center font-bold text-xs text-slate-500">
                                    ${idx + 1}
                                </span>
                                <span class="font-bold text-sm sm:text-base">${escapeHtml(opt.text)}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    selectOption(index) {
        if (this.status !== 'none') return;
        this.selectedOptionIndex = index;
        this.render();
    }

    // =========================================================================
    // 9. ПРОВЕРКА ОТВЕТА (CHECK ANSWER)
    // =========================================================================
    checkAnswer() {
        const challenge = this.currentChallenges[this.currentChallengeIndex];
        if (!challenge || this.status !== 'none') return;

        let isCorrect = false;

        if (challenge.type === 'WORD_BANK') {
            const assembled = this.wordBankSelected.map(t => t.text).join(' ').trim();
            const cleanA = assembled.replace(/[,.!?]/g, '').trim().toLowerCase();
            const cleanT = challenge.targetSentence.replace(/[,.!?]/g, '').trim().toLowerCase();
            isCorrect = cleanA === cleanT;
        } else if (challenge.type === 'MATCH_PAIRS') {
            // Для пар проверка автоматическая при кликах
            isCorrect = this.matchedPairsCount >= challenge.totalPairs;
        } else {
            // SELECT, LISTEN, DIALOGUE
            if (this.selectedOptionIndex === null) return;
            const selected = challenge.options[this.selectedOptionIndex];
            isCorrect = selected && selected.isCorrect;
        }

        if (isCorrect) {
            this.status = 'correct';
            this.xp += 10;
            localStorage.setItem('lingo_xp', this.xp);
            this.playSound('correct');
            // Тактильный виброотклик успеха (Haptic feedback)
            if (navigator.vibrate) {
                try { navigator.vibrate([40, 30, 60]); } catch(e){}
            }
        } else {
            this.status = 'wrong';
            this.hearts = Math.max(0, this.hearts - 1);
            localStorage.setItem('lingo_hearts', this.hearts);
            this.playSound('incorrect');
            // Тактильный отклик ошибки
            if (navigator.vibrate) {
                try { navigator.vibrate([100]); } catch(e){}
            }

            // Автоматическое сохранение ошибки в копилку повторения
            if (challenge.correctOptionText || challenge.targetSentence || challenge.correctFull) {
                const wrongDe = challenge.correctOptionText || challenge.targetSentence || challenge.correctFull;
                const wrongRu = challenge.question || challenge.correctExplanation || '';
                this.saveMistake(wrongDe, wrongRu);
            }

            if (this.hearts === 0) {
                setTimeout(() => {
                    alert('💔 Сердечки восстановились до 5 ❤️! Учитесь спокойно, коуч рядом!');
                    this.hearts = 5;
                    localStorage.setItem('lingo_hearts', 5);
                    this.render();
                }, 800);
            }
        }

        this.render();
        this.syncProgressWithSupabase();
    }

    nextChallenge() {
        this.currentChallengeIndex++;
        this.initChallengeState();
        this.render();
    }

    renderFooter(challenge) {
        if (this.status === 'none') {
            let canCheck = false;
            if (challenge.type === 'WORD_BANK') {
                canCheck = this.wordBankSelected.length > 0;
            } else if (challenge.type === 'MATCH_PAIRS') {
                canCheck = this.matchedPairsCount >= challenge.totalPairs;
            } else {
                canCheck = this.selectedOptionIndex !== null;
            }

            return `
                <footer class="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
                    <button onclick="lingoEngine.checkAnswer()" 
                            ${!canCheck ? 'disabled' : ''}
                            class="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-extrabold text-sm uppercase tracking-wider transition-all duration-150 shadow-sm
                                   ${canCheck ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-b-4 border-emerald-600 active:border-b-0 cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-b-4 border-slate-300'}">
                        Проверить
                    </button>
                </footer>
            `;
        }

        if (this.status === 'correct') {
            const listenBtn = challenge.voiceHint ? `
                <button onclick="playTTS(this, '${escapeQuotes(challenge.correctFull || challenge.correctOptionText || challenge.listenText)}', '${challenge.voiceHint}')"
                        class="px-3 py-1 bg-white text-emerald-800 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-50 transition border border-emerald-200 flex items-center gap-1">
                    <span>🔊</span> <span>Послушать произношение</span>
                </button>
            ` : '';

            return `
                <footer class="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t-2 border-emerald-300 bg-emerald-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shrink-0">
                    <div class="flex items-center gap-3 text-emerald-800 w-full sm:w-auto">
                        <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                            ✓
                        </div>
                        <div class="flex-1">
                            <h4 class="font-extrabold text-base">Великолепно, Алина! ✨</h4>
                            <p class="text-xs text-emerald-700 font-medium">${escapeHtml(challenge.correctExplanation || '')}</p>
                            ${listenBtn}
                        </div>
                    </div>
                    <button onclick="lingoEngine.nextChallenge()" 
                            class="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider border-b-4 border-emerald-600 active:border-b-0 transition shadow-sm shrink-0">
                        Далее ➔
                    </button>
                </footer>
            `;
        }

        if (this.status === 'wrong') {
            return `
                <footer class="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t-2 border-rose-300 bg-rose-100/90 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shrink-0">
                    <div class="flex items-center gap-3 text-rose-800 w-full sm:w-auto">
                        <div class="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                            ✕
                        </div>
                        <div class="flex-1">
                            <h4 class="font-extrabold text-base">Правильный ответ:</h4>
                            <p class="text-xs sm:text-sm text-rose-900 font-bold">${escapeHtml(challenge.targetSentence || challenge.correctOptionText || '')}</p>
                            <p class="text-[11px] text-rose-700">${escapeHtml(challenge.correctExplanation || '')}</p>
                        </div>
                    </div>
                    <button onclick="lingoEngine.nextChallenge()" 
                            class="w-full sm:w-auto px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-extrabold text-sm uppercase tracking-wider border-b-4 border-rose-600 active:border-b-0 transition shadow-sm shrink-0">
                        Понятно ➔
                    </button>
                </footer>
            `;
        }
    }

    // =========================================================================
    // 10. ЭКРАН ПОБЕДЫ (VICTORY SCREEN)
    // =========================================================================
    renderVictoryScreen(container) {
        this.playSound('finish');
        this.streak = Math.min(180, this.streak + 1);
        this.xp += 50;
        localStorage.setItem('lingo_streak', this.streak);
        localStorage.setItem('lingo_xp', this.xp);

        // Отмечаем урок как пройденный
        if (!this.completedLessons.includes(this.currentLessonId)) {
            this.completedLessons.push(this.currentLessonId);
            localStorage.setItem('lingo_completed_lessons', JSON.stringify(this.completedLessons));
        }

        if (window.confetti) {
            window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }

        this.syncProgressWithSupabase();
        if (typeof updateCourseProgressUI === 'function') updateCourseProgressUI();

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto h-full w-full overflow-y-auto space-y-5 bg-white pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <img src="/static/duolingo/finish.svg" class="w-28 h-28 animate-bounce" alt="Victory">
                
                <div>
                    <h2 class="text-2xl font-black text-slate-800">Урок ${this.currentLessonId} завершен! 🎉</h2>
                    <p class="text-slate-500 text-xs mt-1">Великолепная работа, Алина! Ваш немецкий становится увереннее с каждым днём.</p>
                </div>

                <!-- Карточки результатов (XP & Streak) -->
                <div class="grid grid-cols-2 gap-3 w-full">
                    <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 flex flex-col items-center">
                        <span class="text-[11px] font-bold text-amber-700 uppercase">Опыт</span>
                        <div class="flex items-center gap-1.5 text-lg font-extrabold text-amber-900 mt-0.5">
                            <img src="/static/duolingo/points.svg" class="w-4 h-4">
                            <span>+50 XP</span>
                        </div>
                    </div>
                    
                    <div class="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 flex flex-col items-center">
                        <span class="text-[11px] font-bold text-rose-700 uppercase">Серия дней</span>
                        <div class="flex items-center gap-1.5 text-lg font-extrabold text-rose-900 mt-0.5">
                            <span>🔥</span>
                            <span>${this.streak} дн.</span>
                        </div>
                    </div>
                </div>

                <!-- Действия после урока -->
                <div class="w-full space-y-2 pt-1">
                    <button onclick="startLiveGermanCoach(${this.currentLessonId})" 
                            class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider border-b-4 border-purple-800 active:border-b-0 transition shadow-md flex items-center justify-center gap-2">
                        <span>🎙️ Этап 4: Live Voice диалог с коучем ➔</span>
                    </button>
                    ${this.currentLessonId < 180 ? `
                        <button onclick="lingoEngine.startLesson(${this.currentLessonId + 1}, (window.allGermanCourseData ? window.allGermanCourseData.lessons : []))" 
                                class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider border-b-4 border-emerald-600 active:border-b-0 transition shadow-md">
                            Следующий урок Duolingo (День ${this.currentLessonId + 1}) ➔
                        </button>
                    ` : `
                        <div class="p-3 bg-emerald-100 text-emerald-800 rounded-2xl font-black text-xs">
                            🏆 Вы успешно завершили весь 180-дневный курс немецкого B1! Гордимся вами!
                        </div>
                    `}
                    <button onclick="lingoEngine.exitQuiz()" 
                            class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition">
                        🗺️ Вернуться к карте обучения
                    </button>
                </div>
            </div>
        `;
    }

    exitQuiz() {
        if (this.currentChallengeIndex > 0 && this.status !== 'completed') {
            const remaining = this.currentChallenges.length - this.currentChallengeIndex;
            const confirmQuit = confirm(`Алина, осталось всего ${remaining} задания! Точно хотите прервать урок? Прогресс урока не сохранится.`);
            if (!confirmQuit) return;
        }

        document.body.classList.remove('overflow-hidden');
        const lingoContainer = document.getElementById('lingoAppContainer');
        const pathContainer = document.getElementById('germanPathContainer');
        if (lingoContainer) lingoContainer.classList.add('hidden');
        if (pathContainer) {
            pathContainer.classList.remove('hidden');
            this.renderPathView(pathContainer, (window.allGermanCourseData ? window.allGermanCourseData.lessons : []));
        }
    }

    // =========================================================================
    // 11. КАРТА ОБУЧЕНИЯ DUOLINGO (THE LEARNING PATH / ROADMAP)
    // =========================================================================
    renderPathView(container, allLessons) {
        if (!container) return;

        if (!allLessons || !allLessons.length) {
            container.innerHTML = '<div class="text-center p-8 text-slate-400 text-xs">Загрузка уроков Duolingo...</div>';
            return;
        }

        // Текущий уровень
        const currentLevel = window.currentGermanLevel || localStorage.getItem('ai_coach_german_level') || 'A1+';
        const filteredLessons = allLessons.filter(l => l.level === currentLevel);

        // Цвета юнитов
        const unitColors = [
            'from-emerald-500 to-teal-600 border-emerald-600',
            'from-sky-500 to-blue-600 border-sky-600',
            'from-purple-500 to-indigo-600 border-purple-600',
            'from-amber-500 to-orange-600 border-amber-600',
            'from-rose-500 to-pink-600 border-rose-600'
        ];

        // Змейка уроков: смещения кружков влево-вправо (как в мобильном Duolingo)
        const offsets = ['translate-x-0', '-translate-x-8', 'translate-x-0', 'translate-x-8', 'translate-x-0'];

        // Группируем уроки текущего уровня по разделам (юнитам)
        const unitsMap = new Map();
        filteredLessons.forEach(l => {
            const uId = l.unit_id || Math.ceil((l.day || l.id) / 5);
            if (!unitsMap.has(uId)) {
                unitsMap.set(uId, []);
            }
            unitsMap.get(uId).push(l);
        });

        // Быстрое переключение уровней прямо в Duolingo
        const levelSwitcherHtml = `
            <div class="flex items-center justify-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl mb-4 max-w-sm mx-auto shadow-inner border border-slate-200">
                <button onclick="if(typeof setGermanLevel==='function') setGermanLevel('A1+');" class="flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition ${currentLevel === 'A1+' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                    A1+ Старт (30)
                </button>
                <button onclick="if(typeof setGermanLevel==='function') setGermanLevel('A2');" class="flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition ${currentLevel === 'A2' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                    A2 Быт (60)
                </button>
                <button onclick="if(typeof setGermanLevel==='function') setGermanLevel('B1');" class="flex-1 py-1.5 px-2 text-xs font-black rounded-xl transition ${currentLevel === 'B1' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                    B1 Профи (90)
                </button>
            </div>
        `;

        let sectionsHtml = '';
        unitsMap.forEach((uLessons, unitId) => {
            const firstLesson = uLessons[0];
            const unitTitle = firstLesson.unit_title || `Раздел ${unitId}`;
            const colorClass = unitColors[(unitId - 1) % unitColors.length];

            let nodesHtml = '';
            uLessons.forEach((l, idx) => {
                const isCompleted = this.completedLessons.includes(l.day || l.id);
                const isCurrent = (l.day || l.id) === this.currentLessonId;
                const offsetClass = offsets[idx % offsets.length];

                let buttonClass = 'bg-slate-200 border-slate-300 text-slate-400';
                let icon = '🔒';
                if (isCompleted) {
                    buttonClass = 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200';
                    icon = '✓';
                } else if (isCurrent) {
                    buttonClass = 'bg-amber-400 border-amber-500 text-white ring-4 ring-amber-200 animate-pulse';
                    icon = '⭐';
                } else {
                    if ((idx + 1) % 5 === 0) {
                        buttonClass = 'bg-purple-500 border-purple-600 text-white hover:bg-purple-600';
                        icon = '🎁';
                    } else if (idx % 3 === 0) {
                        buttonClass = 'bg-sky-500 border-sky-600 text-white hover:bg-sky-600';
                        icon = '📖';
                    } else if (idx % 3 === 1) {
                        buttonClass = 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600';
                        icon = '⭐';
                    } else {
                        buttonClass = 'bg-rose-500 border-rose-600 text-white hover:bg-rose-600';
                        icon = '💬';
                    }
                }

                nodesHtml += `
                    ${idx > 0 ? `<div class="w-1.5 h-6 border-l-2 border-dashed border-slate-300 opacity-70"></div>` : ''}

                    <div class="flex flex-col items-center my-1 transition-transform ${offsetClass} relative group">
                        ${isCurrent ? `
                            <div class="absolute -left-16 sm:-left-20 top-0 flex flex-col items-center animate-bounce z-20">
                                <img src="/static/duolingo/mascot.svg" class="w-12 h-12" alt="Duolingo Owl">
                                <span class="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full mt-0.5 border border-amber-300 shadow-2xs">СТАРТ</span>
                            </div>
                        ` : ''}

                        <button onclick="lingoEngine.openLessonModal(${l.day || l.id})"
                                class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-b-6 active:border-b-2 flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg transition active:scale-95 cursor-pointer ${buttonClass}">
                            <span>${icon}</span>
                        </button>

                        <div class="mt-1 text-center max-w-[140px]">
                            <span class="text-[10px] font-black text-slate-700 bg-white/95 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs block truncate">
                                День ${l.day || l.id}: ${escapeHtml(l.title.replace(/^День \d+:\s*/, ''))}
                            </span>
                        </div>
                    </div>
                `;
            });

            sectionsHtml += `
                <div class="mb-8 space-y-4">
                    <!-- БАННЕР РАЗДЕЛА (GUIDEBOOK) -->
                    <div class="bg-gradient-to-r ${colorClass} text-white rounded-2xl px-4 py-2.5 shadow-md border-b-2 flex items-center justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <span class="text-[10px] font-black uppercase tracking-wider opacity-90">${escapeHtml(currentLevel)} • РАЗДЕЛ ${unitId}</span>
                            <h3 class="text-sm sm:text-base font-black truncate leading-tight mt-0.5">${escapeHtml(unitTitle.replace(/^Unit \d+:\s*/, ''))}</h3>
                            <p class="text-[10px] opacity-85 truncate mt-0.5">${escapeHtml(firstLesson.grammar || '')}</p>
                        </div>
                        <button onclick="lingoEngine.openGuidebookModal(${unitId})"
                                class="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur rounded-xl font-extrabold text-xs shrink-0 border border-white/30 flex items-center gap-1 transition cursor-pointer">
                            <span>📖</span>
                            <span>Теория</span>
                        </button>
                    </div>

                    <!-- ДОРОЖКА УРОКОВ ЮНИТА -->
                    <div class="py-2 flex flex-col items-center">
                        ${nodesHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="max-w-md mx-auto w-full pb-16">
                ${levelSwitcherHtml}
                ${sectionsHtml}
            </div>
        `;
    }

    // =========================================================================
    // 12. МОДАЛКИ СТАРТА УРОКА И СПРАВОЧНИКА ГРАММАТИКИ
    // =========================================================================
    openLessonModal(lessonId) {
        const allLessons = window.allGermanCourseData?.lessons || [];
        const lesson = allLessons.find(l => (l.day == lessonId || l.id == lessonId)) || allLessons[0];
        if (!lesson) return;

        const modal = document.createElement('div');
        modal.id = 'lingoLessonModal';
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border-2 border-slate-200 text-center space-y-4 animate-scale-up">
                <img src="/static/duolingo/mascot.svg" class="w-16 h-16 mx-auto animate-bounce" alt="Owl">
                <div>
                    <span class="text-rose-600 font-extrabold text-xs uppercase">${lesson.level} • ДЕНЬ ${lesson.day || lesson.id}</span>
                    <h3 class="text-lg font-black text-slate-800 mt-1">${escapeHtml(lesson.title)}</h3>
                    <p class="text-xs text-slate-500 mt-1.5 italic">${escapeHtml(lesson.grammar)}</p>
                </div>

                <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
                    <span class="font-bold text-slate-700 block">План урока:</span>
                    <div>✓ Match Pairs (разминка слов)</div>
                    <div>✓ Word Bank (порядок слов)</div>
                    <div>✓ Listening & Dialogue (речь)</div>
                </div>

                <div class="space-y-2 pt-1">
                    <button onclick="document.getElementById('lingoLessonModal').remove(); lingoEngine.startLesson(${lesson.day || lesson.id}, window.allGermanCourseData.lessons)"
                            class="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider border-b-4 border-emerald-600 active:border-b-0 shadow-md transition">
                        ▶ Начать интерактивный урок (+20 XP)
                    </button>
                    <button onclick="document.getElementById('lingoLessonModal').remove(); if(typeof startFlashcardsForLesson === 'function') startFlashcardsForLesson(${lesson.day || lesson.id}, '${lesson.level}');"
                            class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider border-b-4 border-amber-600 active:border-b-0 shadow-md transition flex items-center justify-center gap-1.5">
                        <span>🗂️ Карточки слов дня (${(lesson.vocabulary || lesson.vocab || []).length} слов)</span>
                    </button>
                    <button onclick="startLiveGermanCoach(${lesson.day || lesson.id})"
                            class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider border-b-4 border-purple-800 active:border-b-0 shadow-md transition flex items-center justify-center gap-1.5">
                        <span>🎙️ Live Voice диалог с коучем (4.5 сек пауза)</span>
                    </button>
                    <button onclick="document.getElementById('lingoLessonModal').remove()"
                            class="w-full py-2 text-slate-400 hover:text-slate-600 font-semibold text-xs transition">
                        Отмена
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    openGuidebookModal(unitId) {
        const allLessons = window.allGermanCourseData?.lessons || [];
        const unitLessons = allLessons.filter(l => (l.unit_id == unitId));
        const sampleLesson = unitLessons[0] || allLessons[0];
        const allUnits = window.allGermanCourseData?.units || [];
        const unitMeta = allUnits.find(u => u.id == unitId);
        const gb = sampleLesson.guidebook || (unitMeta ? unitMeta.guidebook : null);

        const modal = document.createElement('div');
        modal.id = 'lingoGuidebookModal';
        modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl border-2 border-slate-200 space-y-4">
                <div class="flex items-center justify-between border-b pb-3 border-slate-100">
                    <h3 class="text-base font-black text-slate-800 flex items-center gap-2">
                        <span>📖 ${escapeHtml(gb?.title || `Справочник: Юнит ${unitId}`)}</span>
                    </h3>
                    <button onclick="document.getElementById('lingoGuidebookModal').remove()" class="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer">
                        ✕
                    </button>
                </div>

                <!-- Грамматическое объяснение -->
                <div class="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5 leading-relaxed">
                    <div class="font-black flex items-center gap-1.5 text-amber-900">
                        <span>📚</span>
                        <span>Грамматическое правило:</span>
                    </div>
                    <p class="whitespace-pre-line">${escapeHtml(gb?.grammar_summary || sampleLesson.rule_explanation || sampleLesson.grammar)}</p>
                </div>

                <!-- Лайфхак для Германии -->
                ${gb?.tips ? `
                    <div class="bg-sky-50/80 p-3 rounded-2xl border border-sky-200 text-xs text-sky-950 space-y-1 leading-relaxed">
                        <div class="font-black flex items-center gap-1.5 text-sky-900">
                            <span>💡</span>
                            <span>Лайфхак для жизни в Германии:</span>
                        </div>
                        <p>${escapeHtml(gb.tips)}</p>
                    </div>
                ` : ''}

                <!-- Ключевые фразы -->
                ${gb?.key_phrases && gb.key_phrases.length ? `
                    <div class="space-y-1.5">
                        <span class="text-xs font-black text-slate-700 block">⭐ Ключевые конструкции раздела:</span>
                        <div class="space-y-1">
                            ${gb.key_phrases.map(kp => `
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                                    <span class="font-medium text-slate-800">${escapeHtml(kp)}</span>
                                    <button onclick="playTTS(this, '${escapeQuotes(kp.replace(/\s*\([^)]*\)/g, ''))}', 'de-DE-KatjaNeural')"
                                            class="p-1 px-2 bg-white rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-100 text-xs cursor-pointer">
                                        🔊
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Словарь юнита с цветовыми артиклями -->
                <div class="space-y-2">
                    <span class="text-xs font-black text-slate-700 block">🔤 Словарь раздела (с артиклями):</span>
                    <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        ${(sampleLesson.vocabulary || []).map(v => {
                            let badge = '';
                            if (v.article === 'der') badge = '<span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 mr-1.5">der (м)</span>';
                            else if (v.article === 'die') badge = '<span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 mr-1.5">die (ж)</span>';
                            else if (v.article === 'das') badge = '<span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 mr-1.5">das (ср)</span>';

                            return `
                                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2">
                                    <div class="truncate">
                                        <div class="flex items-center">
                                            ${badge}
                                            <span class="font-black text-slate-800">${escapeHtml(v.german)}</span>
                                        </div>
                                        <span class="text-slate-500 block text-[11px] truncate mt-0.5">${escapeHtml(v.russian)}</span>
                                    </div>
                                    <button onclick="playTTS(this, '${escapeQuotes(v.german)}', '${v.voice_hint || 'de-DE-KatjaNeural'}')"
                                            class="p-1 px-2 bg-white rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-100 text-xs shrink-0 cursor-pointer">
                                        🔊
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <button onclick="document.getElementById('lingoGuidebookModal').remove()"
                        class="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer border-b-4 border-emerald-600 active:border-b-0">
                    Всё понятно, перейти к практике!
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // =========================================================================
    // 7. ИНТЕРАКТИВНЫЕ 3D КАРТОЧКИ-ФЛИПЫ (FLASHCARDS)
    // =========================================================================
    openFlashcardsModal(lessonId) {
        const lessons = (window.allGermanCourseData && window.allGermanCourseData.lessons) || [];
        const lesson = lessons.find(l => (l.id == lessonId || l.day == lessonId)) || lessons[0];
        if (!lesson || !lesson.vocabulary || !lesson.vocabulary.length) return;

        const modal = document.createElement('div');
        modal.id = 'lingoFlashcardsModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in';

        let currentIndex = 0;
        const vocab = lesson.vocabulary;

        const renderCard = () => {
            const v = vocab[currentIndex];
            let artClass = '';
            if (v.article === 'der') artClass = 'art-der';
            else if (v.article === 'die') artClass = 'art-die';
            else if (v.article === 'das') artClass = 'art-das';

            return `
                <div class="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-rose-100 flex flex-col text-center">
                    <div class="flex items-center justify-between mb-3 text-xs text-slate-400 font-bold">
                        <span>🎴 Карточка ${currentIndex + 1} из ${vocab.length}</span>
                        <button onclick="document.getElementById('lingoFlashcardsModal').remove()" class="text-slate-400 hover:text-slate-600 text-base">✕</button>
                    </div>

                    <!-- 3D Карточка -->
                    <div id="flashcardBox" onclick="this.classList.toggle('rotate-y-180')" 
                         class="h-52 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border-2 border-rose-200 flex flex-col items-center justify-center p-4 cursor-pointer transition-transform duration-500 perspective-1000 select-none shadow-inner mb-4 relative">
                        <div class="text-2xl font-black text-slate-800 ${artClass}">
                            ${escapeHtml(v.german)}
                        </div>
                        <div class="text-xs text-slate-400 mt-1">
                            ${v.transcription ? escapeHtml(v.transcription) : ''}
                        </div>
                        <div class="text-sm font-bold text-rose-600 mt-3">
                            ${escapeHtml(v.russian)}
                        </div>
                        <div class="text-[10px] text-slate-400 italic mt-2">
                            ${v.example ? `«${escapeHtml(v.example)}»` : 'Нажмите, чтобы перевернуть'}
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button onclick="playTTS(this, '${escapeQuotes(v.german)}', '${v.voice_hint || 'de-DE-KatjaNeural'}')"
                                class="flex-1 py-2.5 bg-rose-100 text-rose-700 font-bold rounded-xl text-xs hover:bg-rose-200 transition">
                            🔊 Озвучить
                        </button>
                        <button id="fcNextBtn" class="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-xl text-xs hover:opacity-95 transition shadow-sm">
                            ${currentIndex < vocab.length - 1 ? 'Дальше ➔' : 'Завершить 🎉'}
                        </button>
                    </div>
                </div>
            `;
        };

        modal.innerHTML = renderCard();
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'fcNextBtn') {
                if (currentIndex < vocab.length - 1) {
                    currentIndex++;
                    modal.innerHTML = renderCard();
                } else {
                    modal.remove();
                }
            }
        });
    }

    // =========================================================================
    // 8. РАБОТА НАД ОШИБКАМИ (MISTAKES REVIEW)
    // =========================================================================
    saveMistake(german, russian) {
        let mistakes = JSON.parse(localStorage.getItem('lingo_mistakes_queue') || '[]');
        if (!mistakes.some(m => m.german === german)) {
            mistakes.push({ german, russian, date: new Date().toISOString() });
            localStorage.setItem('lingo_mistakes_queue', JSON.stringify(mistakes.slice(-30)));
        }
    }

    getMistakesCount() {
        const mistakes = JSON.parse(localStorage.getItem('lingo_mistakes_queue') || '[]');
        return mistakes.length;
    }

    // =========================================================================
    // 9. ТРЕНАЖЕР СПРЯЖЕНИЯ ГЛАГОЛОВ (VERB CONJUGATOR WIDGET)
    // =========================================================================
    showVerbConjugation(verb, russian) {
        const cleanVerb = verb.toLowerCase().trim();
        // Стандартные и неправильные формы немецких глаголов
        const stem = cleanVerb.replace(/(en|n)$/, '');
        let conjugations = {
            'ich': stem + 'e',
            'du': stem + 'st',
            'er / sie / es': stem + 't',
            'wir': cleanVerb,
            'ihr': stem + 't',
            'sie / Sie': cleanVerb
        };

        // Специальные частые глаголы уровня A1-B1
        if (cleanVerb === 'sein') {
            conjugations = { 'ich': 'bin', 'du': 'bist', 'er / sie / es': 'ist', 'wir': 'sind', 'ihr': 'seid', 'sie / Sie': 'sind' };
        } else if (cleanVerb === 'haben') {
            conjugations = { 'ich': 'habe', 'du': 'hast', 'er / sie / es': 'hat', 'wir': 'haben', 'ihr': 'habt', 'sie / Sie': 'haben' };
        } else if (cleanVerb === 'sprechen') {
            conjugations = { 'ich': 'spreche', 'du': 'sprichst', 'er / sie / es': 'spricht', 'wir': 'sprechen', 'ihr': 'sprecht', 'sie / Sie': 'sprechen' };
        } else if (cleanVerb === 'sehen') {
            conjugations = { 'ich': 'sehe', 'du': 'siehst', 'er / sie / es': 'sieht', 'wir': 'sehen', 'ihr': 'seht', 'sie / Sie': 'sehen' };
        } else if (cleanVerb === 'wissen') {
            conjugations = { 'ich': 'weiß', 'du': 'weißt', 'er / sie / es': 'weiß', 'wir': 'wissen', 'ihr': 'wisst', 'sie / Sie': 'wissen' };
        }

        const modal = document.createElement('div');
        modal.id = 'verbConjugationModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-rose-100">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div>
                        <span class="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Глагол • Präsens</span>
                        <h3 class="font-black text-lg text-slate-800 mt-1">${escapeHtml(verb)}</h3>
                        <p class="text-xs text-slate-500">${escapeHtml(russian || '')}</p>
                    </div>
                    <button onclick="document.getElementById('verbConjugationModal').remove()" class="text-slate-400 hover:text-slate-600 text-lg">✕</button>
                </div>

                <div class="space-y-1.5 py-1">
                    ${Object.entries(conjugations).map(([pronoun, form]) => `
                        <div class="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <span class="font-bold text-slate-500">${pronoun}</span>
                            <div class="flex items-center gap-2">
                                <span class="font-black text-slate-800 text-sm">${form}</span>
                                <button onclick="playTTS(this, '${escapeQuotes(pronoun + ' ' + form)}', 'de-DE-KatjaNeural')" class="p-1 text-[11px] bg-white rounded border border-slate-200 shadow-2xs hover:bg-slate-100">🔊</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button onclick="document.getElementById('verbConjugationModal').remove()" class="w-full mt-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition shadow-sm">
                    Понятно!
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // =========================================================================
    // 10. ВОССТАНОВЛЕНИЕ СЕРДЕЧЕК (HEART REFILL SYSTEM)
    // =========================================================================
    openHeartRefillModal() {
        const modal = document.createElement('div');
        modal.id = 'heartRefillModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 text-center">
                <div class="text-4xl mb-2 animate-bounce">❤️</div>
                <h3 class="font-black text-lg text-slate-800">Сердечки Duolingo</h3>
                <p class="text-xs text-slate-500 mt-1">У вас сейчас <strong>${this.hearts} из 5</strong> ❤️</p>
                
                <div class="bg-rose-50 border border-rose-100 rounded-2xl p-4 my-4 text-xs text-rose-900 leading-relaxed text-left">
                    <p class="font-bold mb-1">Как пополнить жизни?</p>
                    <p>Коуч верит в вас! Вы можете мгновенно восстановить все 5 сердечек за экспресс-разминку без томительного ожидания.</p>
                </div>

                <div class="space-y-2">
                    <button onclick="lingoEngine.refillHeartsInstantly()" class="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-95 transition">
                        ⚡️ Восстановить все 5 ❤️
                    </button>
                    <button onclick="document.getElementById('heartRefillModal').remove()" class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    refillHeartsInstantly() {
        this.hearts = 5;
        localStorage.setItem('lingo_hearts', 5);
        const display = document.getElementById('courseHeartsDisplay');
        if (display) display.textContent = '5';
        this.syncProgressWithSupabase();
        const m = document.getElementById('heartRefillModal');
        if (m) m.remove();
        alert('🎉 Ура! Все 5 сердечек восстановлены. Учитесь в удовольствие!');
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
