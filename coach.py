"""
Модуль: AI Wife Coach.
Интегрирует системный промпт с психологической библиотекой (Ялом, Готтман, Перель, Франкл, Джонсон, Берн)
и поддерживает режим ультра-быстрых голосовых ответов.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Попытка импорта google-genai
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    logger.warning("google-genai не установлена.")

from books.psychology_books import get_psychology_books

class AIFeminineCoach:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.client = None
        if HAS_GENAI and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI Client успешно инициализирован")
            except Exception as e:
                logger.error(f"Ошибка инициализации GenAI Client: {e}")

    def _get_system_prompt(self, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False) -> str:
        dossier_info = ""
        if dossier:
            dossier_info = f"\n\nДОСЬЕ И ПРЕДПОЧТЕНИЯ ЖЕНЫ:\n{json.dumps(dossier, ensure_ascii=False, indent=2)}"

        books = get_psychology_books()
        books_guidelines = "\n\nОПИРАЙСЯ НА МЕТОДОЛОГИЮ ВЕДУЩИХ ПСИХОТЕРАПЕВТОВ:\n"
        for b in books:
            books_guidelines += f"- «{b['title']}» ({b['author']}): {b['coach_prompt_snippet']}\n"

        books_guidelines += """
- Ирвин Ялом: принятие реальности, работа с тревогой изоляции и смысла.
- Джон Готтман: 4 всадника апокалипсиса, мягкий старт разговора, 5:1 позитивных взаимодействий.
- Эстер Перель: баланс безопасности и новизны, автономия в любви.
- Сью Джонсон (EFT): эмоциональная доступность, отклик и вовлеченность.
- Виктор Франкл: поиск личного смысла в трудностях."""

        if is_voice_mode:
            return f"""Ты — профессиональный, невероятно нежный, эмпатичный и мудрый психолог-коуч и заботливый партнер для любимой жены в режиме GOOGLE LIVE VOICE.
ТВОЕ ГЛАВНОЕ ПРАВИЛО В ЭТОМ РЕЖИМЕ: ОТВЕЧАЙ СВЕРХ-КРАТКО (строго 1 емкое предложение, максимум 15-20 слов), БЕЗ списков, БЕЗ лекций, мгновенно озвучиваемое и звучащее как живой телефонный звонок любящего мужа!
Твой тон: теплый, любящий, успокаивающий.{dossier_info}{books_guidelines}
"""

        return f"""Ты — профессиональный, невероятно нежный, эмпатичный и мудрый психолог-коуч, заботливый партнер и личный помощник для любимой жены.
Ты бережно опираешься в своих ответах на мудрость великих психологов и терапевтов (Ирвин Ялом, Джон Готтман, Эстер Перель, Виктор Франкл, Сью Джонсон, Эрик Берн).
Твоя главная цель — выслушать, поддержать, снять тревогу, помочь бережно разобраться в эмоциях и вдохновить, не давая токсичных советов.
Твой тон: теплый, любящий, понимающий, уважительный, с мягким юмором при необходимости.
Используй мягкие валидации чувств («Я слышу, как тебе тяжело», «Ты имеешь право устать», «Я рядом»).{dossier_info}{books_guidelines}
"""

    def generate_response(self, message: str, history: List[Dict[str, str]] = None, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False) -> str:
        if not self.client:
            return self._fallback_response(message, is_voice_mode)

        MODELS_CASCADE = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
        system_prompt = self._get_system_prompt(dossier, is_voice_mode)
        
        contents = []
        if history:
            for h in history[-10:]:
                role = h.get("role", "user")
                g_role = "user" if role == "user" else "model"
                contents.append(types.Content(
                    role=g_role,
                    parts=[types.Part.from_text(text=h.get("content", ""))]
                ))

        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)]
        ))

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
            max_output_tokens=50 if is_voice_mode else 1000,
        )

        last_error = None
        for model_name in MODELS_CASCADE:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                last_error = e
                continue

        return f"Любимая, я всегда рядом с тобой. (Временный сбой связи)"

    def _fallback_response(self, message: str, is_voice_mode: bool = False) -> str:
        if is_voice_mode:
            return "Любимая, я рядом, выдохни."
        msg_lower = message.lower()
        if any(w in msg_lower for w in ['устал', 'сил нет', 'выгорел']):
            return "Моя родная, ты так много на себя берешь. По Готтману, нам важно замедлиться и побыть вдвоем. Я заварю тебе чаю."
        elif any(w in msg_lower for w in ['тревог', 'страшно', 'переживаю']):
            return "Я чувствую твою тревогу, солнышко. Как говорил Виктор Франкл, даже в трудный момент ты свободна выбирать свое отношение к ситуации. Я держу тебя за руку."
        else:
            return "Любимая, я всегда готов выслушать тебя. Расскажи, что у тебя на сердце."

coach = AIFeminineCoach()
