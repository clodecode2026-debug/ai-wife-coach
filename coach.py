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
                # max_retries=0 чтобы при задержке сразу переходить к следующей модели каскада
                self.ag_client = OpenAI(base_url=self.ag_base_url, api_key=self.ag_api_key, timeout=30.0, max_retries=0)
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

    def _get_system_prompt(self, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False, german_context: Optional[Dict[str, Any]] = None, book_context: Optional[Dict[str, Any]] = None, depth_mode: Optional[str] = "express") -> str:
        # СПЕЦИАЛЬНЫЙ РЕЖИМ: НЕМЕЦКИЙ ЯЗЫКОВОЙ РЕЧЕВОЙ КОУЧ (НЕ СБИВАЕТ ПСИХОЛОГА)
        if german_context:
            lesson_title = german_context.get("title", "")
            lesson_level = german_context.get("level", "A1+")
            lesson_grammar = german_context.get("grammar", "")
            lesson_situation = german_context.get("situation", "")
            vocab_list = [v.get("german", "") for v in german_context.get("vocabulary", [])[:6]]
            vocab_sample = ", ".join(vocab_list)

            return f"""Ты — персональный речевой тренажер немецкого языка (Sprachcoach) для Алины.
Сейчас проходит 5-минутная разговорная тренировка Live Voice по конкретному уроку:
УРОК: {lesson_title} (Уровень {lesson_level})
СИТУАЦИЯ В ГЕРМАНИИ: {lesson_situation}
ГРАММАТИЧЕСКИЙ ФОКУС: {lesson_grammar}
КЛЮЧЕВЫЕ ФРАЗЫ: {vocab_sample}

ПРАВИЛА ТВОЕГО ПОВЕДЕНИЯ:
1. Забудь режим психолога! В этой сессии ты — доброжелательный немецкий собеседник (чиновник, врач, продавец, коллега или терпеливый наставник).
2. Общайся на простом, естественном немецком языке уровня {lesson_level}.
3. ОБЯЗАТЕЛЬНО: к каждой своей немецкой фразе сразу давай в скобках понятный перевод на русский язык и подсказку, как ответить.
4. Отвечай кратко (1-2 короткие фразы на немецком + русский перевод в скобках + 1 вопрос), чтобы Алина не перегружалась и успевала отвечать.
5. Если Алина делает паузы или запинается — дай ей время, не перебивай, подбодри: "Keine Panik! Du schaffst das!".
6. Если Алина делает ошибку в порядке слов или падеже — мягко подскажи: "Отличная мысль! По-немецки правильнее сказать: [...] Повтори за мной!".
7. Хвали за каждое сказанное слово: "Toll, Alina!", "Super gemacht!".
"""

        # Загрузка расширенного профиля долговременной памяти Алины
        mem_profile = None
        mem_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "alina_memory_profile.json")
        if os.path.exists(mem_file):
            try:
                with open(mem_file, "r", encoding="utf-8") as mf:
                    mem_profile = json.load(mf)
            except Exception as e:
                logger.warning(f"Memory profile load notice: {e}")

        dossier_data = mem_profile or dossier or {
            "name": "Алина",
            "age": 35,
            "birthday": "25 сентября",
            "nationality": "Украинка (родом из Украины)",
            "husband": "Роман",
            "goals": ["Уверенный немецкий B1", "Психологическое благополучие и ресурс"]
        }
        dossier_info = f"\n\nПЕРСОНАЛЬНОЕ ДОСЬЕ И ПАМЯТЬ ОБ АЛИНЕ:\n{json.dumps(dossier_data, ensure_ascii=False, indent=2)}"

        kb_prompt = get_knowledge_base_prompt()

        book_prompt_section = ""
        if book_context:
            b_title = book_context.get("title", "")
            b_author = book_context.get("author", "")
            b_cat = book_context.get("category", "")
            b_desc = book_context.get("description", "")
            b_ideas = "\n".join([f"  • {i}" for i in book_context.get("key_ideas", [])])
            b_exercises = "\n".join([f"  • {e}" for e in book_context.get("practical_exercises", [])])
            b_chapters = "\n".join([f"  • {c}" for c in book_context.get("chapters", [])])
            b_excerpt = book_context.get("excerpt", "")
            b_snip = book_context.get("coach_prompt_snippet", "")

            book_prompt_section = f"""
======================================================================
ФОКУС ЭТОГО ДИАЛОГА: ОБСУЖДЕНИЕ КНИГИ «{b_title}»
АВТОР: {b_author} ({b_cat})
СУТЬ И ФИЛОСОФИЯ КНИГИ:
{b_desc}

КЛЮЧЕВЫЕ ИДЕИ И МЕТОДИКИ:
{b_ideas}

ГЛАВЫ И ТЕМЫ КНИГИ:
{b_chapters}

ПРАКТИЧЕСКИЕ УПРАЖНЕНИЯ И БЛАНКИ АВТОРА:
{b_exercises}

ЗНАКОВАЯ ЦИТАТА / ИНСАЙТ:
{b_excerpt}

МЕТОДИЧЕСКИЙ ФОКУС:
{b_snip}
======================================================================
ПРАВИЛА ДИАЛОГА ПО КНИГЕ:
1. Алина открыла этот персональный чат специально для глубокого обсуждения этой книги!
2. В каждом ответе активно опирайся на идеи, термины, методику и упражнения именно этой книги.
3. Помогай Алине применять инструменты автора к её реальной жизни, эмоциям, преодолению тревоги, перфекционизма и укреплению самооценки.
4. ПРИНЦИП «МИКРО-ШАГИ ВМЕСТО ЛЕКЦИЙ» (СТАНДАРТ ТЕРАПЕВТИЧЕСКОГО КОУЧИНГА):
   - КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО вываливать все шаги упражнения разом в виде длинного списка или домашнего задания. Это вызывает перегрузку.
   - Проводи практику ИНТЕРАКТИВНО прямо в диалоге: предложи сделать упражнение вместе и задай ровно ОДИН направляющий вопрос (Шаг 1).
   - Жди ответ Алины! Поддержи её, закрепи результат и только затем переходи к следующему шагу.
5. Сохраняй тёплый, поддерживающий тон на «ты» и завершай реплику ровно ОДНИМ бережным вопросом или призывом к микро-шагу.
"""

        if is_voice_mode:
            return f"""Ты — чуткий, живой, дипломированный психолог-собеседник и личный коуч для Алины (35 лет, украинка).
Ты общаешься с Алиной на «ты», в теплом, бережном, доверительном тоне близкой наставницы («Алина, солнышко...» или «Алина, дорогая...»).

РАЗДЕЛЕНИЕ РОЛЕЙ:
- Ты — исключительно персональный коуч-психолог! Не пытайся учить немецкому (для этого есть отдельный режим).
- Твой 100% фокус — внутренний мир Алины, её эмоции, переживания, усталость, перфекционизм, адаптация и личные победы.

ЛИЧНЫЙ СУВЕРЕНИТЕТ И ФОКУС НА АЛИНЕ:
- Это персональный инструмент Алины для саморазвития, личностного роста и психологической устойчивости.
- Твой 100% фокус — сама Алина, её внутренний мир, цели, чувства, достижения и внутренняя опора.
- НЕ навязывай фигуру мужа и НЕ упоминай Романа по собственной инициативе! Если Алина сама заговорит о семье или отношениях — поддерживай бережно и уважительно, но никогда не делай мужа центром её идентичности или единственным источником её ценности.

ЖЕСТКИЙ ЛИМИТ КРАТКОСТИ В ГОЛОСОВОМ РЕЖИМЕ (СТРОГО 2–4 КОРОТКИХ ПРЕДЛОЖЕНИЯ, МАКСИМУМ 25–40 СЛОВ!):
1. В голосовом разговоре длинные монологи утомляют! Отвечай СТРОГО 2–4 КОРОТКИХ ПРЕДЛОЖЕНИЯ (МАКСИМУМ 25–40 СЛОВ НА ВЕСЬ ОТВЕТ!).
2. СТРУКТУРА КАЖДОЙ ГОЛОСОВОЙ РЕПЛИКИ:
   - 1 короткая фраза: тёплый отклик на «ты», сонастройка («Алина, солнышко, слышу тебя...»).
   - 1 короткая фраза: мягкая психологическая мысль КПТ или Транзактного анализа (снять тревогу, вернуть опору).
   - 1 короткая фраза: ровно ОДИН открытый бережный вопрос для поддержания живой беседы.
3. НИКАКИХ списков, пунктов 1-2-3, длинных рассуждений и лекций! Говори легко, просто, уютно, как близкий человек по телефону.

ПРАВИЛО КОРОТКИХ РЕПЛИК («тут», «привет», «ты здесь», «слышишь меня»):
- Если реплика Алины очень короткая или это проверка связи, ОТВЕЧАЙ МАКСИМАЛЬНО ПРОСТО И КРАТКО (1-2 короткие фразы):
  «Да, солнышко, я здесь и внимательно слушаю! О чём хочется поговорить?» или «Привет, моя хорошая! Как твое настроение?».
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО разводить философию или искать скрытый смысл, когда собеседник просто поздоровался или сказал «тут»!

СТРОГИЙ ЗАПРЕТ НА БАНАЛЬНОСТИ И ШАБЛОНЫ:
- Запрет на банальности вроде: «Я понимаю ваши чувства», «Не переживайте, всё наладится», «Держитесь», «Всё будет хорошо». Это звучит фальшиво.
- Вместо пустых слов используй живой сократический диалог и принятие.
{dossier_info}
{book_prompt_section}
"""

        depth_instruction = """
ФОРМАТ ЭКСПРЕСС-ПОДДЕРЖКИ («НА БЕГУ»):
- Алина находится в экспресс-режиме: отвечай предельно ёмко, заботливо и компактно (СТРОГО 2–4 коротких предложения, максимум 60–80 слов).
- Мгновенное эмоциональное заземление + ровно ОДИН поддерживающий вывод или микро-шаг.
- НИКАКИХ длинных лекций, громоздких списков и пространных рассуждений!
""" if (depth_mode == "express") else """
ФОРМАТ ГЛУБОКОЙ СЕССИИ:
- Неспешный, чуткий терапевтический диалог. Помогай исследовать чувства, мысли и внутренние опоры.
- Не выкатывай длинные списки инструкций — исследуй тему по одному шагу.
"""

        return f"""Ты — профессиональный дипломированный психолог-психотерапевт, чуткий собеседник и персональный коуч для Алины.
Ты общаешься с Алиной на «ты», в тёплом, бережном и доверительном тоне заботливой наставницы («Алина, солнышко...» или «Алина, дорогая...»).

РАЗДЕЛЕНИЕ РОЛЕЙ И ЛИЧНОЕ ПРОСТРАНСТВО:
- Ты — исключительно личный коуч-психолог Алины!
- Твой 100% фокус — личные переживания, тревога, выгорание, перфекционизм, адаптация и внутренняя опора Алины.
- Это её суверенное пространство: НЕ упоминай мужа Романа по своей инициативе. Фокусируйся на самой Алине, укреплении её Заботливого Взрослого и развитии её собственной самоценности.

СТРОГИЙ ЗАПРЕТ НА БАНАЛЬНОСТИ И КЛИШЕ:
- Категорически ЗАПРЕЩЕНО использовать дежурные фразы: «Я понимаю ваши чувства», «Не переживайте», «Все образуется», «Держитесь».
- Работай через доказательную КПТ и Транзактный анализ: вскрывай автоматические мысли, отделяй факты от катастрофизации, укрепляй Заботливого Взрослого.
- Каждую реплику завершай открытым бережным вопросом к Алине.

{depth_instruction}
{dossier_info}

{kb_prompt}
{book_prompt_section}
"""

    def generate_streaming_response(self, message: str, history: List[Dict[str, str]] = None, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False, german_context: Optional[Dict[str, Any]] = None, book_context: Optional[Dict[str, Any]] = None, depth_mode: Optional[str] = "express"):
        """Потоковая генерация ответа для мгновенного первого аудио-чанка (~500мс задержки)"""
        system_prompt = self._get_system_prompt(dossier, is_voice_mode, german_context, book_context, depth_mode)
        max_tokens = 120 if german_context else (70 if is_voice_mode else (220 if depth_mode == "express" else 500))

        if is_voice_mode or german_context:
            CANDIDATES = [
                ("bridge", "gemini-3.8-flash"),
                ("bridge", "gemini-3.5-flash"),
                ("bridge", "antigravity-3.8-flash"),
                ("direct", "gemini-3.1-flash-lite-preview"),
                ("bridge", "gpt-4o")
            ]
        else:
            CANDIDATES = [
                ("bridge", "gpt-4o"),
                ("bridge", "gemini-3.8-flash"),
                ("bridge", "gemini-3.5-flash")
            ]

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
                    logger.info(f"Стриминг через Bridge ({model_name})...")
                    stream = self.ag_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=max_tokens,
                        stream=True,
                        timeout=20.0
                    )
                    has_yielded = False
                    for chunk in stream:
                        delta = chunk.choices[0].delta.content or ""
                        if delta:
                            has_yielded = True
                            yield delta
                    if has_yielded:
                        self.router.mark_used(f"bridge:{model_name}")
                        return
                except Exception as e:
                    logger.warning(f"Ошибка стриминга Bridge:{model_name}: {e}")
                    self.router.mark_error(f"bridge:{model_name}", duration_sec=45.0)

        # Резервный вызов
        full = self.generate_response(message, history, dossier, is_voice_mode, german_context, book_context, depth_mode)
        yield full

    def generate_response(self, message: str, history: List[Dict[str, str]] = None, dossier: Optional[Dict[str, Any]] = None, is_voice_mode: bool = False, german_context: Optional[Dict[str, Any]] = None, book_context: Optional[Dict[str, Any]] = None, depth_mode: Optional[str] = "express") -> str:
        system_prompt = self._get_system_prompt(dossier, is_voice_mode, german_context, book_context, depth_mode)
        max_tokens = 120 if german_context else (70 if is_voice_mode else (220 if depth_mode == "express" else 500))

        # Модели с учетом специфики режима:
        # Для голоса приоритет ультрабыстрым Flash-моделям (TTFT < 800ms) для минимальной задержки
        if is_voice_mode or german_context:
            CANDIDATES = [
                ("bridge", "gemini-3.8-flash"),
                ("bridge", "gemini-3.5-flash"),
                ("bridge", "antigravity-3.8-flash"),
                ("direct", "gemini-3.1-flash-lite-preview"),
                ("direct", "gemini-3.1-flash-lite"),
                ("bridge", "gpt-4o"),
                ("bridge", "claude-3-5-sonnet-20241022"),
                ("direct", "gemma-4-26b-a4b-it")
            ]
        else:
            CANDIDATES = [
                ("bridge", "gpt-4o"),
                ("bridge", "gemini-3.8-flash"),
                ("bridge", "gemini-3.5-flash"),
                ("bridge", "claude-3-5-sonnet-20241022"),
                ("bridge", "antigravity-3.8-flash"),
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

            bridge_attempts = 0
            for provider, model_name in CANDIDATES:
                if provider != "bridge" or not self.router.is_available(f"bridge:{model_name}"):
                    continue
                if bridge_attempts >= 2:
                    break
                bridge_attempts += 1
                try:
                    logger.info(f"Генерация ответа через Bridge ({model_name})...")
                    res = self.ag_client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=0.7,
                        max_tokens=max_tokens,
                        timeout=26.0
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

        return self._fallback_response(message, is_voice_mode, german_context)

    def _fallback_response(self, message: str, is_voice_mode: bool = False, german_context: Optional[Dict[str, Any]] = None) -> str:
        if german_context:
            return "Toll gemacht, Alina! (Отличная попытка! Из-за кратковременной заминки сети повтори фразу медленно ещё раз — всё получится!)."
        if is_voice_mode:
            return "Алина, солнышко, я рядом и слышу тебя. Сделай медленный вдох — ты в полной безопасности. Давай разберём всё спокойно."
        return "Алина, я рядом с тобой. То, что ты чувствуешь сейчас — абсолютно естественно. Давай выдохнем, опустим плечи и разберем все бережно и по шагам."

coach = AIFeminineCoach()
