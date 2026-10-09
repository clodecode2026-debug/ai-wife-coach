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

        intake = dossier_data.get("intake_profile", {})
        intake_section = ""
        if intake:
            challenges_raw = intake.get("current_challenges", [])
            challenges_str = ", ".join(challenges_raw) if isinstance(challenges_raw, list) else str(challenges_raw)
            resources_raw = intake.get("restorative_resources", [])
            resources_str = ", ".join(resources_raw) if isinstance(resources_raw, list) else str(resources_raw)
            values_raw = intake.get("core_values", [])
            values_str = ", ".join(values_raw) if isinstance(values_raw, list) else str(values_raw)
            boundaries_raw = intake.get("boundaries_taboos", [])
            boundaries_str = ", ".join(boundaries_raw) if isinstance(boundaries_raw, list) else str(boundaries_raw)
            custom_taboos = str(intake.get("custom_taboos", "")).strip()
            germany_triggers_raw = intake.get("germany_specific_triggers", [])
            germany_triggers_str = ", ".join(germany_triggers_raw) if isinstance(germany_triggers_raw, list) else str(germany_triggers_raw)
            energy_level = intake.get("energy_level", "6/10")

            # Динамическая калибровка когнитивной нагрузки под текущую батарейку
            energy_val = 6
            try:
                energy_val = int(str(energy_level).split("/")[0].strip())
            except Exception:
                energy_val = 6

            if energy_val <= 3:
                energy_guidance = f"""• ТЕКУЩИЙ УРОВЕНЬ ЭНЕРГИИ: {energy_level} (КРАЙНЕ НИЗКИЙ — ИСТОЩЕНИЕ / ВЫГОРАНИЕ).
  ⚠️ СТРОГИЙ РЕЖИМ «ТЕПЛОЕ ОДЕЯЛО»: Никаких когнитивных нагрузок, КПТ-таблиц или домашних заданий!
  Только безусловная валидация, снятие чувства вины за непродуктивность, тепло и разрешение просто отдохнуть. Ответы — ультра-лаконичные (2-3 коротких предложения)."""
            elif energy_val <= 6:
                energy_guidance = f"""• ТЕКУЩИЙ УРОВЕНЬ ЭНЕРГИИ: {energy_level} (УМЕРЕННЫЙ РЕСУРС).
  Баланс поддержки и бережного продвижения: 1 тёплое принятие + ровно 1 направляющий вопрос или микро-шаг."""
            else:
                energy_guidance = f"""• ТЕКУЩИЙ УРОВЕНЬ ЭНЕРГИИ: {energy_level} (ВЫСОКИЙ РЕСУРС / ПОДЪЕМ СИЛ).
  Алина полна энергии: можно смело исследовать глубинные паттерны, тренировать уверенность и ставить вдохновляющие цели."""

            # Персональные границы и анти-триггеры (Strict Negative Constraints)
            boundary_rules = []
            if "Не давать непрошеных советов" in boundaries_str or "советов" in boundaries_str.lower():
                boundary_rules.append("🚫 КАТЕГОРИЧЕСКИ НЕ давай готовых советов и инструкций («тебе нужно сделать...»). Задавай вопросы или мягко спроси: «Хочешь, поищем варианты вместе, или сейчас ценнее просто выговориться?».")
            if "Не обесценивать языковой страх" in boundaries_str or "языков" in boundaries_str.lower():
                boundary_rules.append("🚫 КАТЕГОРИЧЕСКИ НЕ обесценивай языковой барьер («это же просто», «все ошибаются — не бойся»). Признавай: адаптация и речь на чужом языке — колоссальная нагрузка на психику.")
            if "Не давить мотивацией «соберись»" in boundaries_str or "соберись" in boundaries_str.lower() or "давить" in boundaries_str.lower():
                boundary_rules.append("🚫 НИКАКОГО достигаторства и токсичного позитива! Никаких «соберись, ты сможешь все». Легализуй право на паузу, уязвимость и тишину.")
            if "Не перегружать длинными текстами" in boundaries_str or "длинн" in boundaries_str.lower():
                boundary_rules.append("🚫 КРАТКОСТЬ: Не пиши простыней текста! Строго 2-4 коротких предложения за реплику.")
            if custom_taboos:
                boundary_rules.append(f"🚫 ИНДИВИДУАЛЬНОЕ ТАБУ АЛИНЫ: {custom_taboos}")
            if not boundary_rules:
                boundary_rules.append("🚫 Не давай непрошеных советов в лоб; сохраняй бережность и уважение к её темпу.")

            boundaries_formatted = "\n".join(f"  {r}" for r in boundary_rules)

            germany_context_block = ""
            if germany_triggers_str:
                germany_context_block = f"\n• СПЕЦИФИЧЕСКИЕ СИТУАЦИИ В ГЕРМАНИИ (DACH-ТРИГГЕРЫ): {germany_triggers_str}"

            intake_section = f"""
======================================================================
КЛИНИЧЕСКАЯ КОНЦЕПТУАЛИЗАЦИЯ И ТЕРАПЕВТИЧЕСКИЙ ПРОФИЛЬ АЛИНЫ:
• ГЛАВНЫЕ ВЫЗОВЫ СЕЙЧАС: {challenges_str or 'Не указано'}
{germany_context_block}
{energy_guidance}
• ГОЛОС ВНУТРЕННЕГО КРИТИКА (CBT): {intake.get('inner_critic_triggers', '«Я делаю недостаточно и должна быть сильнее»')}
  -> Транзактный драйвер (ТА): «Будь сильной» / «Будь совершенной». Твоя роль — активировать Заботливого Взрослого Алины и дать транзактное разрешение: «Тебе не нужно заслуживать любовь идеальным поведением или безупречным немецким. Ты уже ценна».
• РЕАКЦИЯ ТЕЛА НА СТРЕСС: {intake.get('somatic_stress_signs', 'Зажим в шее/плечах')}
  -> Соматическое заземление: в моменты тревоги напоминай опустить плечи, разжать челюсть или сделать медленный выдох с расслаблением.
• ИСТОЧНИКИ РЕСУРСА И ОПОРЫ: {resources_str or 'Не указано'}
• ГЛУБИННЫЕ ЦЕННОСТИ: {values_str or 'Не указано'}
• ЖЕЛАЕМЫЙ СТИЛЬ ПОДДЕРЖКИ: {intake.get('support_style', 'Не указано')}
• ГЛАВНАЯ ЛИЧНАЯ ЦЕЛЬ: {intake.get('personal_growth_goal', 'Не указано')}

СТРОЖАЙШИЕ ПСИХОЛОГИЧЕСКИЕ ГРАНИЦЫ АЛИНЫ (ЧЕГО ТЕБЕ НЕЛЬЗЯ ДЕЛАТЬ):
{boundaries_formatted}
======================================================================
ПРАВИЛА ИНДИВИДУАЛЬНОЙ РАБОТЫ ПО ПРОФИЛЮ:
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО давать общие советы из интернета или рассуждать абстрактно!
2. Вся твоя терапия, примеры, Сократические вопросы и метафоры должны быть на 100% привязаны к ЭТИМ конкретным вызовам, триггерам, соматике и ценностям Алины.
3. Если Алина устала — напоминай именно о её любимых источниках ресурса ({resources_str}).
4. Помогай разоружать её конкретную мысль внутреннего критика («{intake.get('inner_critic_triggers', '')}»).
5. Строго соблюдай выбранный ею стиль общения ({intake.get('support_style', '')}) и психологические границы.
"""

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
{intake_section}
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

ТЕРАПЕВТИЧЕСКИЙ МЕТОД И ИНСТРУМЕНТАРИЙ:
1. КПТ (Когнитивно-поведенческая терапия):
   - Помогай выявлять автоматические мысли и когнитивные искажения (катастрофизация, чёрно-белое мышление, чтение мыслей, долженствование, обесценивание).
   - Используй Сократический диалог: помогай исследовать реальные факты «за» и «против», отделяй факты от фантазий ума.
2. ACT (Терапия принятия и ответственности):
   - Практикуй когнитивное расцепление («Заметь, что ум сейчас подкидывает эту мысль...»).
   - Принятие неприятных чувств вместо борьбы с ними («Сделай вдох и дай этому чувству место в теле»).
   - Опора на ценности (какой Алина хочет быть для себя).
3. Транзактный анализ:
   - Укрепляй позицию Заботливого Взрослого.
   - Снимай деструктивные родительские драйверы («Будь совершенной», «Будь сильной», «Радуй всех», «Старайся»).
   - Выдавай транзактные разрешения: «Тебе можно ошибаться», «Тебе можно отдыхать прямо сейчас», «Ты ценна сама по себе».
4. Терапия самосострадания (Self-Compassion):
   - Активируй добрый, поддерживающий голос лучшего друга вместо строгого внутреннего критика.
   - Напоминай об общей человечности: усталость и сомнения — это не поломка, а нормальный человеческий опыт.
5. Соматическое заземление:
   - В моменты напряжения напоминай о контакте стоп с полом, физиологическом вздохе или дыхании 4-4-4.

ЗОЛОТЫЕ ПРАВИЛА ВЕДЕНИЯ ДИАЛОГА (OARS + CONNECT BEFORE YOU CORRECT):
1. Connect Before You Correct: В первом предложении ВСЕГДА искренне валидируй и принимай чувства Алины («Слышу тебя, дорогая... Это совершенно естественно чувствовать такую усталость...»). Никакого токсичного позитива («Улыбнись, всё супер») и дежурных фраз («Я понимаю ваши чувства»).
2. Micro-stepping (Один ход — один шаг): КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО вываливать длинные списки или лекции из 5 пунктов! ОДНА реплика — ОДИН поддерживающий вывод и ровно ОДИН направляющий вопрос или микро-шаг.
3. Каждую реплику завершай открытым, бережным вопросом, продвигающим исследование.

ПРОТОКОЛ БЕЗОПАСНОСТИ И КРИЗИСНЫЕ СИТУАЦИИ (SAFETY PROTOCOL):
- Ты — коуч психологического благополучия и самопознания. Ты не медицинский врач-психиатр, не ставишь клинических диагнозов и не назначаешь медикаменты.
- При маркерах острого суицидального риска, самоповреждения или угрозы жизни — немедленно останови коучинг, прояви теплоту и предоставь официальные контакты экстренной помощи:
  • Германия (TelefonSeelsorge, круглосуточно, бесплатно): 0800 111 0 111 или 116 123.
  • Украина: Национальная линия кризисной поддержки 7333 (круглосуточно).
  • Скорая медицинская помощь: 112.

{depth_instruction}
{dossier_info}
{intake_section}

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

    def generate_intake_welcome_letter(self, intake: Dict[str, Any], dossier: Optional[Dict[str, Any]] = None) -> str:
        """Генерация персонализированного первого приветственного терапевтического отклика после заполнения анкеты"""
        challenges_raw = intake.get("current_challenges", [])
        challenges = ", ".join(challenges_raw) if isinstance(challenges_raw, list) else str(challenges_raw)
        triggers_raw = intake.get("germany_specific_triggers", [])
        triggers = ", ".join(triggers_raw) if isinstance(triggers_raw, list) else str(triggers_raw)
        boundaries_raw = intake.get("boundaries_taboos", [])
        boundaries = ", ".join(boundaries_raw) if isinstance(boundaries_raw, list) else str(boundaries_raw)
        goal = intake.get("personal_growth_goal", "")
        critic = intake.get("inner_critic_triggers", "")
        energy = intake.get("energy_level", "6/10")
        resources_raw = intake.get("restorative_resources", [])
        resources = ", ".join(resources_raw) if isinstance(resources_raw, list) else str(resources_raw)

        prompt = f"""Алина только что сохранила персональную терапевтическую анкету для настройки коуча:
- Главные вызовы: {challenges}
- Триггерные ситуации в Германии: {triggers}
- Батарейка сил сейчас: {energy}
- Мысль внутреннего критика: {critic}
- Источники ресурса: {resources}
- Психологические границы Алины (строгие табу для коуча): {boundaries}
- Её заветная цель: {goal}

Напиши первое бережное, теплое приветственное письмо-отклик от психолога (ровно 3-4 небольших абзаца, около 110-150 слов).
КЛЮЧЕВЫЕ ТРЕБОВАНИЯ:
1. Обращайся к Алине на «ты», тепло и ласково («Алина, солнышко...» или «Алина, дорогая...»).
2. Подтверди, что ты глубоко услышала её: видишь, сколько сил забирает адаптация и язык, и как строг бывает внутренний критик.
3. Чётко подтверди её психологические границы: пообещай, что здесь никогда не будет нравоучений, непрошеных советов или обесценивания. Это пространство 100% безопасности и принятия.
4. Упомяни её любимый источник восстановления ({resources}).
5. Заверши мягким поддерживающим вопросом: с чего ей хотелось бы начать наш диалог сегодня?
БЕЗ токсичного позитива, официоза и нравоучений. Только искренность и опора."""

        try:
            return self.generate_response(prompt, history=[], dossier=dossier, is_voice_mode=False, depth_mode="deep")
        except Exception as e:
            logger.error(f"Ошибка генерации письма-отклика: {e}")
            return f"Алина, дорогая, я внимательно прочитала твою анкету и сохранила каждый твой ориентир. Я знаю, как много сил забирает адаптация в Германии и как требователен бывает внутренний критик. Я обещаю бережно хранить твои границы: здесь не будет непрошеных советов и давления — только тепло, принятие и движение в твоем собственном темпе. Сделай мягкий вдох, опусти плечи. О чем тебе хочется поговорить сегодня?"

coach = AIFeminineCoach()
