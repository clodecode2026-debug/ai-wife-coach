
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
    logger.warning("google-genai не установлена. Установите через pip install google-genai")

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

    def _get_system_prompt(self, dossier: Optional[Dict[str, Any]] = None) -> str:
        dossier_info = ""
        if dossier:
            dossier_info = f"\n\nДОСЬЕ И ПРЕДПОЧТЕНИЯ ЖЕНЫ:\n{json.dumps(dossier, ensure_ascii=False, indent=2)}"

        return f"""Ты — профессиональный, невероятно нежный, эмпатичный и мудрый психолог-коуч, заботливый партнер и личный помощник для любимой жены.
Твоя главная цель — выслушать, поддержать, снять тревогу, помочь бережно разобраться в эмоциях и вдохновить, не давая токсичных советов.
Твой тон: теплый, любящий, понимающий, уважительный, с мягким юмором при необходимости.
Используй мягкие валидации чувств («Я слышу, как тебе тяжело», «Ты имеешь право устать», «Я рядом»).{dossier_info}
"""

    def generate_response(self, message: str, history: List[Dict[str, str]] = None, dossier: Optional[Dict[str, Any]] = None) -> str:
        if not self.client:
            # Fallback если нет ключа
            return self._fallback_response(message)

        # Каскад моделей согласно заданию (октябрь 2026: gemini-2.5 отключен, используем gemini-3.x)
        MODELS_CASCADE = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.8-flash']
        
        system_prompt = self._get_system_prompt(dossier)
        
        # Формируем контент
        contents = []
        if history:
            for h in history[-10:]: # последние 10 сообщений
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
            max_output_tokens=1000,
        )

        last_error = None
        for model_name in MODELS_CASCADE:
            try:
                logger.info(f"Попытка генерации ответа через модель: {model_name}")
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response and response.text:
                    logger.info(f"Успешный ответ от модели {model_name}")
                    return response.text
            except Exception as e:
                last_error = e
                logger.warning(f"Модель {model_name} вернула ошибку: {e}. Переключаемся на следующую в каскаде...")
                continue

        logger.error(f"Все модели из каскада {MODELS_CASCADE} вернули ошибку. Последняя ошибка: {last_error}")
        return f"Солнышко, произошла временная заминка связи с моим сердцем (все модели ИИ заняты или недоступны). Но я всегда рядом с тобой!"

    def _fallback_response(self, message: str) -> str:
        msg_lower = message.lower()
        if any(w in msg_lower for w in ['устал', 'сил нет', 'выгорел', 'задолбал']):
            return "Моя родная, ты так много на себя берешь. Пожалуйста, остановись и выдохни. Давай сегодня отложим все дела. Я могу заварить тебе чаю или просто посидеть рядом молча?"
        elif any(w in msg_lower for w in ['тревог', 'страшно', 'переживаю', 'сомневаюсь']):
            return "Я чувствую твою тревогу, солнышко. Это абсолютно нормально — чувствовать неуверенность. Давай разберем это вместе по шагам. Ты в полной безопасности со мной."
        elif any(w in msg_lower for w in ['цель', 'мечта', 'план', 'хочу']):
            return "Ты способна на любые свершения, моя умница! Твои желания очень важны. Какой маленький первый шаг мы можем сделать к этой цели сегодня?"
        else:
            return "Любимая, я всегда готов выслушать тебя. Расскажи подробнее, что у тебя на сердце, я полностью на твоей стороне."

coach = AIFeminineCoach()
