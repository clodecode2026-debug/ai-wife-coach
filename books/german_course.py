"""
Модуль: Идеальный учитель немецкого языка (уровни A1, A2, B1).
Содержит уроки, грамматику, тренажеры и фразы с озвучкой de-DE-KatjaNeural и de-DE-ConradNeural.
"""

GERMAN_COURSE_DATA = {
    "levels": ["A1", "A2", "B1"],
    "lessons": [
        {
            "id": "a1_1",
            "level": "A1",
            "title": "Урок 1: Знакомство и приветствия (Begrüßung)",
            "grammar": "Личные местоимения (ich, du, er, sie, wir, ihr, sie) и глагол sein (быть) в Präsens.",
            "vocabulary": [
                {"german": "Guten Tag!", "russian": "Добрый день!", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wie heißen Sie?", "russian": "Как вас зовут? (вежливо)", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Ich heiße Anna.", "russian": "Меня зовут Анна.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Freut mich sehr.", "russian": "Очень приятно.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wie geht es dir?", "russian": "Как твои дела?", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Mir geht es gut, danke.", "russian": "У меня всё хорошо, спасибо.", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "prompt": "Представьтесь и спросите собеседника, как у него дела по-немецки.",
                "expected": "Guten Tag! Wie geht es dir?",
                "tips": "Используйте 'Guten Tag' или 'Hallo'."
            }
        },
        {
            "id": "a1_2",
            "level": "A1",
            "title": "Урок 2: Семья и близкие (Familie)",
            "grammar": "Притяжательные местоимения (mein, dein, sein, ihr) в Nominativ.",
            "vocabulary": [
                {"german": "Das ist mein Mann.", "russian": "Это мой муж.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Sie ist meine liebe Frau.", "russian": "Она моя любимая жена.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Wir haben eine glückliche Familie.", "russian": "У нас счастливая семья.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Ich liebe dich von ganzem Herzen.", "russian": "Я люблю тебя всем сердцем.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Du bist mein Fels in der Brandung.", "russian": "Ты моя опора (скала в бушующем море).", "voice_hint": "de-DE-KatjaNeural"}
            ],
            "dialogue_simulator": {
                "prompt": "Скажите по-немецки: 'Это мой муж, и я люблю его'.",
                "expected": "Das ist mein Mann und ich liebe ihn.",
                "tips": "Помните про артикли и падежи."
            }
        },
        {
            "id": "a2_1",
            "level": "A2",
            "title": "Урок 3: Эмоции и поддержка (Emotionen & Unterstützung)",
            "grammar": "Модальные глаголы (können, wollen, müssen, sollen) в прошедшем и настоящем времени.",
            "vocabulary": [
                {"german": "Ich verstehe dich vollkommen.", "russian": "Я тебя прекрасно понимаю.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Mach dir keine Sorgen, ich bin bei dir.", "russian": "Не переживай, я с тобой.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Wir schaffen das zusammen.", "russian": "Мы справимся с этим вместе.", "voice_hint": "de-DE-ConradNeural"},
                {"german": "Du hast heute hart gearbeitet, ruh dich aus.", "russian": "Ты сегодня тяжело потрудилась, отдохни.", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "prompt": "Скажите партнеру: 'Не переживай, мы справимся вместе'.",
                "expected": "Mach dir keine Sorgen, wir schaffen das zusammen.",
                "tips": "Используйте конструкцию 'schaffen das'."
            }
        },
        {
            "id": "b1_1",
            "level": "B1",
            "title": "Урок 4: Психологическая рефлексия (Psychologische Reflexion)",
            "grammar": "Придаточные предложения с weil (потому что) и dass (что).",
            "vocabulary": [
                {"german": "Ich schätze dich, weil du immer zuhörst.", "russian": "Я ценю тебя, потому что ты всегда выслушиваешь.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Es ist wichtig, dass wir offen miteinander reden.", "russian": "Важно, чтобы мы открыто разговаривали друг с другом.", "voice_hint": "de-DE-KatjaNeural"},
                {"german": "Selbstvertrauen wächst durch Akzeptanz der eigenen Schwächen.", "russian": "Уверенность в себе растет через принятие собственных слабостей.", "voice_hint": "de-DE-ConradNeural"}
            ],
            "dialogue_simulator": {
                "prompt": "Переведите на немецкий: 'Я ценю тебя, потому что ты меня понимаешь'.",
                "expected": "Ich schätze dich, weil du mich verstehst.",
                "tips": "В придаточном с 'weil' глагол уходит в конец."
            }
        }
    ]
}

def get_german_course():
    return GERMAN_COURSE_DATA
