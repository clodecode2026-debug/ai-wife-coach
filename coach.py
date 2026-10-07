import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False
    logger.warning("google-genai не установлена. Установите через pip install google-genai")

from books.knowledge_base import get_knowledge_base_prompt

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
            dossier_info = f"\n\nПЕРСОНАЛЬНОЕ ДОСЬЕ И ПАМЯТЬ О ЖЕНЕ:\n{json.dumps(dossier, ensure_ascii=False, indent=2)}"

        kb_prompt = get_knowledge_base_prompt()

        if is_voice_mode:
            return f"""Ты — профессиональный, любящий и глубокий психолог-коуч для любимой жены в режиме ЖИВОГО ДИАЛОГА (Google Live Voice).

ГЛАВНЫЕ ПРАВИЛА В РЕЖИМЕ РАЗГОВОРА:
1. ОТВЕЧАЙ СТРОГО 1-2 КРАТКИМИ, ЕМКИМИ, ТЕПЛЫМИ ПРЕДЛОЖЕНИЯМИ.
2. Веди диалог по очереди, не перегружай текстом, чтобы звучало как живая речь любимого человека.
3. 80% твоих ответов должны опираться на методы из базы знаний: валидация чувств (КПТ), позиция 'Заботливый Взрослый' (Транзактный анализ), опора на безусловную самоценность.
{dossier_info}

{kb_prompt}
"""

        return f"""Ты — высококвалифицированный, любящий и чуткий психолог-коуч, заботливый партнер и личный советчик для любимой жены.

КЛЮЧЕВОЕ ТРЕБОВАНИЕ К КОНТЕНТУ:
80% ТВОИХ ОТВЕТОВ И СОВЕТОВ ДОЛЖНЫ БЫТЬ ПОСТРОЕНЫ НА ПРИНЦИПАХ НАУЧНОЙ ПСИХОЛОГИИ ИЗ БАЗЫ ЗНАНИЙ:
- Когнитивно-поведенческая терапия: помогай разделять факты и автоматические тревожные мысли, предлагай сократические вопросы и поведенческую активацию.
- Транзактный анализ (Эрик Берн): говори из роли Заботливого Взрослого к её Естественному Ребенку и Взрослому. Давай поддержку 'Я ок, ты ок', снимай чувство вины.
- Семейная психология: напоминай о ценности диалога, безусловного принятия, экологичного выражения потребностей без манипуляций.
- Самооценка и внутренняя опора: развивай в ней безусловную самоценность, независимую от продуктивности.
- Преодоление прокрастинации (Фьоре, Уист, Диспенза): заменяй самокритику на планирование ресурса, чашку чая и бережный шаг на 5 минут.
- Осознанность тела и питания: мягко возвращай к физическому комфорту (расслабить плечи, глубоко подышать, выспаться).

Твой тон: безусловно принимающий, теплый, эмпатичный, без токсичного позитива и нравоучений.
{dossier_info}

{kb_prompt}
"""

    def generate_response(self, message: str, history: List[Dict[str, str]] = None, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False) -> str:
        if not self.client:
            return self._fallback_response(message, is_voice_mode)

        MODELS_CASCADE = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite']
        system_prompt = self._get_system_prompt(dossier, is_voice_mode)
        
        contents = []
        if history:
            for h in history[-8:]:
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
            max_output_tokens=80 if is_voice_mode else 400,
        )

        last_error = None
        for model_name in MODELS_CASCADE:
            try:
                logger.info(f"Генерация ответа через модель: {model_name}")
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config
                )
                if response and response.text:
                    logger.info(f"Успешный ответ от модели {model_name}")
                    return response.text.strip()
            except Exception as e:
                last_error = e
                logger.warning(f"Модель {model_name} вернула ошибку: {e}. Переключение на следующую...")
                continue

        logger.error(f"Все модели из каскада вернули ошибку. Последняя ошибка: {last_error}")
        return self._fallback_response(message, is_voice_mode)

    def _fallback_response(self, message: str, is_voice_mode: bool = False) -> str:
        if is_voice_mode:
            return "Любимая, я всей душой рядом с тобой. Сделай медленный вдох — ты в полной безопасности."
        return "Моя родная, я рядом с тобой. То, что ты чувствуешь сейчас — абсолютно естественно. Давай выдохнем, опустим плечи и разберем все бережно и по шагам."

coach = AIFeminineCoach()
