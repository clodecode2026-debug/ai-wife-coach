"""
Модуль: Комплексный профессиональный курс немецкого языка (A1 -> A2 -> B1).
Включает структурированный план обучения, грамматические разборы, жизненные темы (Jobcenter, покупки, жилье, врач, чувства),
диалоги-тренажеры и эталонную нейро-озвучку Katja (женский) и Conrad (мужской).
"""

GERMAN_COURSE_DATA = {
    "levels": ["A1", "A2", "B1"],
    "study_plan": [
        {"stage": "A1: Базовый старт", "duration": "4-6 недель", "goal": "Понимание базовых фраз, знакомство, покупки, кафе, ориентация в городе, рассказ о себе и семье."},
        {"stage": "A2: Повседневная жизнь в Германии", "duration": "6-8 недель", "goal": "Визиты к врачу, диалог в Jobcenter/Bürgeramt, аренда квартиры, общественный транспорт, прошедшее время Perfekt."},
        {"stage": "B1: Свободное общение и работа", "duration": "8-10 недель", "goal": "Выражение личного мнения, эмоций, обоснование решений (weil, dass, obwohl), собеседования, уверенное ведение дел."}
    ],
    "lessons": [
        # УРОВЕНЬ A1
        {
            "id": "a1_1",
            "level": "A1",
            "title": "Урок 1: Первые шаги — Приветствия и знакомство (Begrüßung & Kennenlernen)",
            "grammar": "Личные местоимения (ich, du, er/sie, wir, ihr, sie/Sie) и спряжение глаголов sein (быть) и heißen (зваться) в Präsens.",
            "rule_explanation": "Глагол в немецком повествовательном предложении ВСЕГДА стоит на 2-м месте: 'Ich heiße Anna' или 'Heute bin ich glücklich'.",
            "vocabulary": [
                {"german": "Guten Tag! Wie heißen Sie?", "russian": "Добрый день! Как вас зовут? (вежливо)", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Ich heiße Anna und ich lerne Deutsch.", "russian": "Меня зовут Анна, и я учу немецкий.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Freut mich sehr, Sie kennenzulernen.", "russian": "Очень приятно познакомиться с вами.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Wie geht es dir heute?", "russian": "Как у тебя сегодня дела?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Mir geht es super, danke! Und dir?", "russian": "У меня всё супер, спасибо! А у тебя?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Auf Wiedersehen! Bis bald!", "russian": "До свидания! До скорого!", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Вы встретили новую знакомую в языковой школе. Поздоровайтесь и спросите её имя.",
                "example": "Hallo! Ich heiße Anna. Wie heißt du?",
                "tips": "Для неформального общения используйте 'du', для официального — 'Sie'."
            }
        },
        {
            "id": "a1_2",
            "level": "A1",
            "title": "Урок 2: В магазине и кафе (Einkaufen & Im Café)",
            "grammar": "Артикли (der, die, das), винительный падеж Akkusativ (den, die, das) и вежливая форма 'Ich möchte...'.",
            "rule_explanation": "В Akkusativ изменяется только мужской род: der Apfel -> Ich möchte den Apfel. Женский и средний не меняются.",
            "vocabulary": [
                {"german": "Ich möchte bitte einen Kaffee und ein Croissant.", "russian": "Я хотела бы кофе и круассан, пожалуйста.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Was kostet das zusammen?", "russian": "Сколько это стоит вместе?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Das macht zusammen vier Euro fünfzig.", "russian": "С вас четыре евро пятьдесят.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Kann ich mit Karte bezahlen?", "russian": "Могу ли я оплатить картой?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ja, natürlich. Vielen Dank!", "russian": "Да, конечно. Большое спасибо!", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Einen schönen Tag noch!", "russian": "Хорошего вам дня!", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Закажите в немецком кафе чай и спросите, можно ли расплатиться картой.",
                "example": "Ich möchte bitte einen grünen Tee. Kann ich mit Karte bezahlen?",
                "tips": "Фраза 'Ich möchte...' — самый естественный способ вежливого заказа."
            }
        },
        {
            "id": "a1_3",
            "level": "A1",
            "title": "Урок 3: Семья, дом и чувства (Familie & Gefühle)",
            "grammar": "Притяжательные местоимения (mein/meine, dein/deine) и модальный глагол können (мочь, уметь).",
            "rule_explanation": "Если существительное женского рода или во множественном числе, добавляем -e: mein Mann, но meine Familie, meine Gefühle.",
            "vocabulary": [
                {"german": "Das ist meine Familie. Wir halten immer zusammen.", "russian": "Это моя семья. Мы всегда держимся вместе.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ich bin heute ein bisschen müde.", "russian": "Я сегодня немного устала.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Du brauchst etwas Ruhe und Entspannung.", "russian": "Тебе нужен отдых и расслабление.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Ich liebe gemütliche Abende zu Hause.", "russian": "Я обожаю уютные вечера дома.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Alles wird gut, mach dir keine Sorgen.", "russian": "Всё будет хорошо, не переживай.", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Расскажите коучу, что вы устали после тяжелого дня и хотите отдохнуть.",
                "example": "Ich bin sehr müde. Ich möchte mich ausruhen und Tee trinken.",
                "tips": "'sich ausruhen' — отдыхать, расслабляться."
            }
        },

        # УРОВЕНЬ A2
        {
            "id": "a2_1",
            "level": "A2",
            "title": "Урок 4: Официальные визиты: Bürgeramt & Jobcenter",
            "grammar": "Модальные глаголы müssen (должен), dürfen (иметь разрешение) и прошедшее время Perfekt со слабыми глаголами.",
            "rule_explanation": "В прошедшем времени Perfekt вспомогательный глагол (haben/sein) стоит на 2 месте, а Partizip II (ge...t) — в самом конце предложения.",
            "vocabulary": [
                {"german": "Ich habe einen Termin um zehn Uhr.", "russian": "У меня запись (термин) на десять часов.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Hier sind meine Unterlagen und mein Pass.", "russian": "Вот мои документы и мой паспорт.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Füllen Sie bitte dieses Formular aus.", "russian": "Заполните, пожалуйста, этот бланк.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Ich habe die Bestätigung per E-Mail geschickt.", "russian": "Я отправила подтверждение по электронной почте.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wann bekomme ich den Bescheid?", "russian": "Когда я получу официальное решение?", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Вы пришли в ведомство по термину. Сообщите сотруднику о времени записи и передайте документы.",
                "example": "Guten Tag, ich habe einen Termin um 10 Uhr. Hier sind meine Dokumente.",
                "tips": "Слово 'der Termin' в Германии — ключ к любому учреждению."
            }
        },
        {
            "id": "a2_2",
            "level": "A2",
            "title": "Урок 5: Здоровье и визит к врачу (Beim Arzt & Wohlbefinden)",
            "grammar": "Дательный падеж Dativ с предлогами (mit, nach, bei, seit, von, zu) и выражение жалоб: 'Mir tut ... weh'.",
            "rule_explanation": "Конструкция боли: 'Mir tut der Kopf weh' (болит голова, ед.ч.) или 'Mir tun die Beine weh' (болят ноги, мн.ч.).",
            "vocabulary": [
                {"german": "Mir tut seit gestern der Rücken weh.", "russian": "У меня со вчерашнего дня болит спина.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ich brauche ein Rezept für diese Medikamente.", "russian": "Мне нужен рецепт на эти лекарства.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ruhen Sie sich aus und trinken Sie viel Tee.", "russian": "Отдохните и пейте много чая.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Ich fühle mich heute schon viel besser.", "russian": "Сегодня я чувствую себя уже намного лучше.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Gute Besserung! Passen Sie auf sich auf!", "russian": "Скорейшего выздоровления! Берегите себя!", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Объясните доктору, что у вас болит голова и вы плохо спали.",
                "example": "Guten Tag, Herr Doktor. Mir tut der Kopf weh und ich habe schlecht geschlafen.",
                "tips": "Используйте 'Gute Besserung' для пожелания здоровья."
            }
        },
        {
            "id": "a2_3",
            "level": "A2",
            "title": "Урок 6: Аренда жилья и обустройство (Wohnungssuche)",
            "grammar": "Предлоги двойного управления (Wechselpräpositionen): где? (Dativ) vs куда? (Akkusativ).",
            "rule_explanation": "Вопрос 'Wo?' (покой) требует Dativ: Das Bild hängt an der Wand. Вопрос 'Wohin?' (движение) требует Akkusativ: Ich hänge das Bild an die Wand.",
            "vocabulary": [
                {"german": "Ich suche eine helle Zweizimmerwohnung.", "russian": "Я ищу светлую двухкомнатную квартиру.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wie hoch ist die Warmmiete inklusive Nebenkosten?", "russian": "Какова полная арендная плата включая коммунальные услуги?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Die Wohnung liegt in einer ruhigen Gegend.", "russian": "Квартира находится в спокойном районе.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Wann ist der Besichtigungstermin?", "russian": "Когда просмотр квартиры?", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Спросите арендодателя о стоимости квартиры с коммунальными услугами и дате просмотра.",
                "example": "Guten Tag! Wie hoch ist die Warmmiete und wann kann ich die Wohnung besichtigen?",
                "tips": "Warmmiete = базовая аренда (Kaltmiete) + коммуналка (Nebenkosten)."
            }
        },

        # УРОВЕНЬ B1
        {
            "id": "b1_1",
            "level": "B1",
            "title": "Урок 7: Сложные предложения: Причины и цели (weil, dass, obwohl)",
            "grammar": "Придаточные предложения (Nebensätze) с союзами weil (потому что), obwohl (хотя), dass (что). Порядок слов: глагол уходит в САМЫЙ КОНЕЦ.",
            "rule_explanation": "В придаточном предложении спрягаемый глагол ВСЕГДА стоит на последнем месте: 'Ich lerne Deutsch, weil ich in Deutschland leben WILL'.",
            "vocabulary": [
                {"german": "Ich lerne Deutsch, weil ich mich integrieren möchte.", "russian": "Я учу немецкий, потому что хочу интегрироваться.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Obwohl es manchmal schwer ist, gebe ich niemals auf.", "russian": "Хотя иногда бывает тяжело, я никогда не сдаюсь.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ich glaube fest daran, dass Träume wahr werden können.", "russian": "Я твердо верю в то, что мечты могут сбываться.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Es ist wichtig, dass wir offen über Gefühle sprechen.", "russian": "Важно, чтобы мы открыто говорили о чувствах.", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Объясните собеседнику, почему для вас важно учить немецкий язык каждый день, несмотря на усталость.",
                "example": "Ich lerne jeden Tag Deutsch, obwohl ich oft müde bin, weil ich frei sprechen möchte.",
                "tips": "Следите за глаголом в конце придаточного предложения!"
            }
        },
        {
            "id": "b1_2",
            "level": "B1",
            "title": "Урок 8: Психологическая рефлексия и личностный рост (Psychologie & Reflexion)",
            "grammar": "Конструкции с um... zu + Infinitiv (для того чтобы) и сослагательное наклонение Konjunktiv II (wäre, hätte, würde).",
            "rule_explanation": "Konjunktiv II выражает вежливость и мечты: 'Ich würde gerne...' (я бы с удовольствием), 'Wenn ich mehr Zeit hätte...' (если бы у меня было больше времени).",
            "vocabulary": [
                {"german": "Ich brauche Zeit für mich, um neue Energie zu tanken.", "russian": "Мне нужно время для себя, чтобы восстановить силы (заправиться энергией).", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wenn ich gestresst bin, hilft mir ein tiefer Atemzug.", "russian": "Когда я в стрессе, мне помогает глубокий вдох.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Jeder Tag ist eine neue Chance, glücklich zu sein.", "russian": "Каждый день — это новый шанс быть счастливой.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ich bin stolz auf meinen Fortschritt im Leben.", "russian": "Я горжусь своим жизненным прогрессом.", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "situation": "Сформулируйте на немецком языке вашу главную цель в жизни и то, что дает вам внутреннее спокойствие.",
                "example": "Mein Ziel ist innere Ruhe. Ich nehme mir Zeit, um meine Gedanken zu ordnen.",
                "tips": "'stolz auf (+Akk)' — гордиться чем-то."
            }
        }
    ]
}
