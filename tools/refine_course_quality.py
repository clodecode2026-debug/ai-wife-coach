# -*- coding: utf-8 -*-
import json
import re

COURSE_PATH = "books/german_180days_course.json"
TRANSLATIONS_PATH = "tools/complete_translations_map.json"

with open(COURSE_PATH, "r", encoding="utf-8") as f:
    course = json.load(f)

with open(TRANSLATIONS_PATH, "r", encoding="utf-8") as f:
    translations_map = json.load(f)

# Аутентичные диалоги для Дней 41-50
AUTHENTIC_DIALOGUES_41_50 = {
    41: {
        "situation": "Покупка мебели или расстановка предметов дома с Романом: куда поставить стол и где он стоит.",
        "example": "Stellen wir den Tisch an das Fenster oder bleibt er in der Ecke stehen?",
        "tips": "Разница: 'an das Fenster' (куда? Akkusativ), 'in der Ecke' (где? Dativ)."
    },
    42: {
        "situation": "Вы вешаете настенный светильник над столом в гостиной.",
        "example": "Die Hängelampe soll direkt über dem Tisch hängen.",
        "tips": "Предлог über с Dativ (über dem Tisch) обозначает покой над предметом."
    },
    43: {
        "situation": "Встреча возле аптеки или магазина в городе.",
        "example": "Warten wir direkt neben der Apotheke oder zwischen den beiden Geschäften?",
        "tips": "Предлоги neben и zwischen требуют Dativ при вопросе 'где?' (Wo?)."
    },
    44: {
        "situation": "Перестановка вещей и наведение уюта в комнате.",
        "example": "Ich stelle die Vase auf die Kommode und lege das Buch auf das Sofa.",
        "tips": "Глаголы движения stellen и legen всегда требуют Akkusativ (куда?)."
    },
    45: {
        "situation": "Ориентирование на вокзале или ожидание транспорта.",
        "example": "Ich stehe schon an der Haltestelle und warte auf die Straßenbahn.",
        "tips": "Глагол stehen (стоять) обозначает покой и требует Dativ (an der Haltestelle)."
    },
    46: {
        "situation": "Визит в Bürgeramt: первая регистрация по месту жительства (Anmeldung).",
        "example": "Guten Tag! Ich habe einen Termin für die Anmeldung unseres Wohnsitzes.",
        "tips": "Назовите цель 'Anmeldung' и покажите паспорт с подтверждением от арендодателя."
    },
    47: {
        "situation": "Проверка регистрационного формуляра у сотрудника ведомства.",
        "example": "Sind alle Angaben im Anmeldeformular so vollständig und korrekt?",
        "tips": "Слово 'die Angaben' (данные) постоянно встречается в анкетах Германии."
    },
    48: {
        "situation": "Передача справки от арендодателя (Wohnungsgeberbestätigung).",
        "example": "Hier ist die Wohnungsgeberbestätigung, die unser Vermieter unterschrieben hat.",
        "tips": "Без этого документа регистрация невозможна — держите оригинал наготове."
    },
    49: {
        "situation": "Получение официального свидетельства о регистрации (Meldebestätigung).",
        "example": "Vielen Dank für die Meldebestätigung! Brauche ich noch weitere Nachweise?",
        "tips": "Сохраните Meldebestätigung — этот документ нужен для банка, страховки и Jobcenter."
    },
    50: {
        "situation": "Уточнение вопроса о налоговом номере (Steuer-ID) в Bürgeramt.",
        "example": "Kommt die Steuer-ID automatisch per Post an unsere neue Adresse?",
        "tips": "Steuer-ID приходит письмом из Bundeszentralamt für Steuern в течение 2-4 недель."
    }
}

lessons = course.get("lessons", [])
updated_vocab_count = 0
updated_dialogues_count = 0

for lesson in lessons:
    day = lesson.get("day")
    
    # 1. Обновление диалогов Дней 41-50
    if day in AUTHENTIC_DIALOGUES_41_50:
        lesson["dialogue_simulator"] = AUTHENTIC_DIALOGUES_41_50[day]
        updated_dialogues_count += 1
    elif "dialogue_simulator" in lesson:
        ds = lesson["dialogue_simulator"]
        sit = ds.get("situation", "")
        # Очистка нелепых префиксов
        clean_sit = re.sub(r'^(Жизненная ситуация в Германии \(День \d+\):\s*|Ситуация Дня \d+:\s*)', '', sit).strip()
        if clean_sit:
            ds["situation"] = clean_sit
            
        ex = ds.get("example", "")
        # Убираем дубли "Guten Tag! Guten Tag!"
        ex = re.sub(r'^(Guten Tag!\s*)+', 'Guten Tag! ', ex).strip()
        ds["example"] = ex

    # 2. Обновление словаря
    for v in lesson.get("vocabulary", []):
        de = v.get("german", "").strip()
        ru = v.get("russian", "").strip()
        ex = v.get("example", "").strip()
        ex_tr = v.get("example_translation", "").strip()
        
        # Исправление двойных точек в конце
        if ex.endswith(".."):
            ex = ex[:-1]
            v["example"] = ex
        if ex_tr.endswith(".."):
            ex_tr = ex_tr[:-1]
            v["example_translation"] = ex_tr
            
        # Если перевод отсутствует или на немецком
        if de in translations_map:
            correct_ru = translations_map[de]
            if ru.lower() == de.lower() or not re.search(r'[а-яА-ЯёЁіІїЇєЄ]', ru):
                v["russian"] = correct_ru
                updated_vocab_count += 1
                
            # Если пример был пустой или дублем
            if not ex or ex.replace(".", "").strip() == de.replace(".", "").strip():
                v["example"] = f"{de.rstrip('.')}."
                v["example_translation"] = f"{correct_ru.rstrip('.')}."

        # Очистка транскрипции если она была пустой или дублем
        if not v.get("transcription") or v.get("transcription") == f"[{de.lower()}]":
            # Формируем аккуратную транскрипцию
            clean_de = de.lower().replace("ä", "э").replace("ö", "ё").replace("ü", "ю").replace("ß", "сс")
            clean_de = clean_de.replace("sch", "ш").replace("ch", "хь").replace("ie", "и").replace("ei", "ай").replace("eu", "ой")
            v["transcription"] = f"[{clean_de}]"

print(f"Обновлено переводов слов: {updated_vocab_count}")
print(f"Обновлено диалогов: {updated_dialogues_count}")

# Сохраняем
with open(COURSE_PATH, "w", encoding="utf-8") as f:
    json.dump(course, f, ensure_ascii=False, indent=2)

print("Файл курса успешно сохранен.")
