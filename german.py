import random
from typing import Dict, Any, List

class GermanTrainer:
    def __init__(self):
        self.levels = {
            "A1": [
                {"de": "Guten Morgen, mein Schatz!", "ru": "Доброе утро, сокровище!", "hint": "Приветствие"},
                {"de": "Wie war dein Tag?", "ru": "Как прошёл твой день?", "hint": "Вопрос о дне"},
                {"de": "Ich liebe dich von ganzem Herzen.", "ru": "Я люблю тебя всем сердцем.", "hint": "Признание"}
            ],
            "A2": [
                {"de": "Heute möchte ich mich entspannen.", "ru": "Сегодня я хочу расслабиться.", "hint": "Желание"},
                {"de": "Eine Tasse warmer Tee tut mir gut.", "ru": "Чашка теплого чая пойдет мне на пользу.", "hint": "Забота о себе"}
            ],
            "B1": [
                {"de": "Es ist wichtig, auf die eigene innere Stimme zu hören.", "ru": "Важно прислушиваться к своему внутреннему голосу.", "hint": "Рефлексия"},
                {"de": "Kleine Pausen geben uns neue Kraft für den Tag.", "ru": "Маленькие паузы дают нам новые силы на весь день.", "hint": "Мотивация"}
            ],
            "B2": [
                {"de": "Selbstfürsorge ist kein Egoismus, sondern eine absolute Notwendigkeit.", "ru": "Забота о себе — это не эгоизм, а абсолютная необходимость.", "hint": "Психология"}
            ]
        }

    def get_card(self, level: str = "A1") -> Dict[str, str]:
        """Возвращает случайную карточку для изучения немецкого языка"""
        level = level.upper()
        cards = self.levels.get(level, self.levels["A1"])
        return random.choice(cards)

    def check_translation(self, level: str, german_text: str, user_translation: str) -> Dict[str, Any]:
        """Мягко проверяет перевод и даёт бережную обратную связь"""
        level = level.upper()
        cards = self.levels.get(level, self.levels["A1"])
        
        target = None
        for card in cards:
            if card["de"].strip().lower() == german_text.strip().lower():
                target = card
                break

        if not target:
            return {
                "correct": True,
                "message": "Умничка! Твой перевод звучит очень естественно и красиво."
            }

        correct_ru = target["ru"].lower()
        user_ru = user_translation.strip().lower()

        match_score = sum(1 for word in user_ru.split() if word in correct_ru) / max(1, len(correct_ru.split()))

        if match_score >= 0.4 or user_ru in correct_ru or correct_ru in user_ru:
            return {
                "correct": True,
                "expected": target["ru"],
                "message": "Великолепно! Смысл передан абсолютно точно. Ты делаешь прекрасные успехи в немецком!"
            }
        else:
            return {
                "correct": False,
                "expected": target["ru"],
                "message": f"Ты почти уловила суть! Дословный или более точный вариант: «{target['ru']}». Продолжай в том же духе!"
            }
