import os
import json
import logging
import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Попытка импорта Google GenAI SDK (если есть)
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Попытка импорта OpenAI SDK (для моста Antigravity Bridge)
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

from books.knowledge_base import get_knowledge_base_prompt

class ModelRouter:
    """
    Интеллектуальный роутер моделей с учётом:
    - Актуальности на 7 октября 2026 года
    - Суточного лимита вызовов (с автосбросом раз в сутки в 00:00 UTC)
    - Временных блокировок при ошибках (Rate Limit 429, Timeout, Unavailable 503)
    - Каскадного переключения: сначала быстрые и умные модели дня, затем резерв
    """
    def __init__(self):
        self.last_reset_day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        self.call_counts: Dict[str, int] = {}
        self.cooldowns: Dict[str, float] = {}

    def check_daily_reset(self):
        current_day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        if current_day != self.last_reset_day:
            logger.info(f"Новые сутки ({current_day})! Автоматический сброс дневных лимитов моделей.")
            self.last_reset_day = current_day
            self.call_counts.clear()
            self.cooldowns.clear()

    def is_available(self, model: str) -> bool:
        self.check_daily_reset()
        now = datetime.datetime.now().timestamp()
        if self.cooldowns.get(model, 0) > now:
            return False
        return True

    def mark_used(self, model: str):
        self.check_daily_reset()
        self.call_counts[model] = self.call_counts.get(model, 0) + 1

    def mark_error(self, model: str, duration_sec: float = 60.0):
        now = datetime.datetime.now().timestamp()
        self.cooldowns[model] = now + duration_sec
        logger.warning(f"Модель {model} временно отправлена в кулдаун на {duration_sec}с")

class AIFeminineCoach:
    def __init__(self):
        self.router = ModelRouter()
        
        # Настройки моста Antigravity Bridge (OpenAI-compatible)
        self.ag_base_url = os.environ.get("AG_BASE_URL", "https://agent-master-server.onrender.com/v1").rstrip("/")
        self.ag_api_key = os.environ.get("AG_API_KEY", "sk-antigravity-master-roman")
        self.ag_client = None
        if HAS_OPENAI and self.ag_api_key:
            try:
                self.ag_client = OpenAI(base_url=self.ag_base_url, api_key=self.ag_api_key, timeout=25.0)
                logger.info(f"OpenAI-совместимый клиент успешно подключен к {self.ag_base_url}")
            except Exception as e:
                logger.error(f"Ошибка создания OpenAI клиента: {e}")

        # Настройки прямого Google GenAI
        self.gemini_key = os.environ.get("GEMINI_API_KEY")
        self.genai_client = None
        if HAS_GENAI and self.gemini_key:
            try:
                self.genai_client = genai.Client(api_key=self.gemini_key)
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
        system_prompt = self._get_system_prompt(dossier, is_voice_mode)
        max_tokens = 80 if is_voice_mode else 350

        # Актуальный каскад на 7 октября 2026 года
        # Сначала ультрабыстрые и стабильные модели с моста
        CANDIDATES = [
            ("bridge", "gemini-3.8-flash"),
            ("bridge", "claude-3-5-sonnet-20241022"),
            ("bridge", "gpt-4o"),
            ("bridge", "gemini-3.5-flash"),
            ("bridge", "antigravity-3.8-pro"),
            ("direct", "gemini-3.1-flash-lite-preview"),
            ("direct", "gemma-4-26b-a4b-it"),
            ("direct", "gemini-3.1-flash-lite")
        ]

        # 1. Попытка через мост (OpenAI protocol)
        if self.ag_client:
            messages = [{"role": "system", "content": system_prompt}]
            if history:
                for h in history[-8:]:
                    messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
            messages.append({"role": "user", "content": message})

            for provider, model_name in CANDIDATES:
                if provider != "bridge" or not self.router.is_available(f"bridge:{model_name}"):
                    continue
                try:
                    logger.info(f"Генерация ответа через Bridge ({model_name})...")
                    res = self.ag_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=max_tokens,
                        timeout=14.0
                    )
                    content = res.choices[0].message.content
                    if content and content.strip():
                        self.router.mark_used(f"bridge:{model_name}")
                        logger.info(f"Успешный ответ получен от Bridge:{model_name}")
                        return content.strip()
                except Exception as e:
                    logger.warning(f"Ошибка Bridge:{model_name}: {e}")
                    self.router.mark_error(f"bridge:{model_name}", duration_sec=45.0)

        # 2. Попытка напрямую через Google GenAI (прямой ключ)
        if self.genai_client:
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
                max_output_tokens=max_tokens,
            )

            for provider, model_name in CANDIDATES:
                if provider != "direct" or not self.router.is_available(f"direct:{model_name}"):
                    continue
                try:
                    logger.info(f"Генерация через прямой Google GenAI ({model_name})...")
                    resp = self.genai_client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                    if resp and resp.text and resp.text.strip():
                        self.router.mark_used(f"direct:{model_name}")
                        logger.info(f"Успешный ответ от прямого GenAI:{model_name}")
                        return resp.text.strip()
                except Exception as e:
                    logger.warning(f"Ошибка прямого GenAI:{model_name}: {e}")
                    self.router.mark_error(f"direct:{model_name}", duration_sec=60.0)

        return self._fallback_response(message, is_voice_mode)

    def _fallback_response(self, message: str, is_voice_mode: bool = False) -> str:
        if is_voice_mode:
            return "Любимая, я всей душой рядом с тобой. Сделай медленный вдох — ты в полной безопасности."
        return "Моя родная, я рядом с тобой. То, что ты чувствуешь сейчас — абсолютно естественно. Давай выдохнем, опустим плечи и разберем все бережно и по шагам."

coach = AIFeminineCoach()
