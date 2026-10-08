import os
import io
import re
import uuid
import asyncio
import logging
import hmac
import hashlib
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, Response, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from pydantic import BaseModel
import uvicorn
import base64

load_dotenv()

# Импорты наших модулей
from coach import coach
from database import db_manager
from german import get_german_phrases
from library import get_library_items
from storage import s3_storage
from books.psychology_books import get_psychology_books, PSYCHOLOGY_BOOKS, get_book_by_id
from books.german_course import get_german_course, GERMAN_COURSE_DATA

# Пин-код и авторизация
APP_PIN = os.environ.get("APP_PIN", "2509").strip()
AUTH_SECRET = os.environ.get("AUTH_SECRET", os.environ.get("ADMIN_TOKEN", "alina_secret_key_2026_wife")).strip()
VALID_AUTH_TOKEN = hmac.new(AUTH_SECRET.encode(), f"alina_{APP_PIN}".encode(), hashlib.sha256).hexdigest()

def verify_token_str(token: Optional[str]) -> bool:
    if not token:
        return False
    return hmac.compare_digest(token.strip(), VALID_AUTH_TOKEN)

def require_auth(request: Request) -> bool:
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    if verify_token_str(token):
        return True
    raise HTTPException(status_code=401, detail="Требуется авторизация (пин-код 2509)")

# Попытка импорта edge-tts
try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Wife Coach Super-App", version="3.1.0")

# Монтируем статику
app.mount("/static", StaticFiles(directory="static"), name="static")

async def supabase_anti_sleep_worker():
    """Фоновый воркер анти-засыпания Supabase (каждые 6 часов)"""
    while True:
        try:
            await asyncio.sleep(6 * 3600)
            await asyncio.to_thread(db_manager.keepalive_ping)
        except Exception as e:
            logger.warning(f"Anti-sleep worker notice: {e}")
            await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    # Немедленный разогревающий пинг и запуск фонового цикла
    try:
        await asyncio.to_thread(db_manager.keepalive_ping)
    except Exception as e:
        logger.warning(f"Initial keepalive ping notice: {e}")
    asyncio.create_task(supabase_anti_sleep_worker())

class PinLoginRequest(BaseModel):
    pin: str

@app.post("/api/auth/login")
def api_auth_login(req: PinLoginRequest, response: Response):
    if req.pin.strip() == APP_PIN:
        # Устанавливаем долговременную куку на 10 лет для iOS PWA и браузера
        response.set_cookie(
            key="auth_token",
            value=VALID_AUTH_TOKEN,
            max_age=315360000,
            path="/",
            samesite="lax",
            httponly=False
        )
        return {"ok": True, "token": VALID_AUTH_TOKEN}
    raise HTTPException(status_code=401, detail="Неверный пин-код")

@app.get("/api/auth/check")
def api_auth_check(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    if verify_token_str(token):
        return {"authenticated": True}
    return {"authenticated": False}

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"
    is_voice_mode: bool = False
    mode: Optional[str] = "coach"  # "coach" | "german"
    german_lesson_id: Optional[int] = None
    book_id: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    voice: str = "ru-RU-SvetlanaNeural"

class VoiceSaveRequest(BaseModel):
    audio_base64: str
    filename: str = "voice_note.mp3"

class GermanCheckRequest(BaseModel):
    sentence: str
    german_text: str
    user_translation: str

class GermanProgressRequest(BaseModel):
    xp: int = 0
    hearts: int = 5
    streak: int = 1
    lesson_id: int = 1

@app.get("/", response_class=HTMLResponse)
async def read_index():
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        return HTMLResponse(content=f"<h1>AI Wife Coach</h1><p>Ошибка загрузки интерфейса: {e}</p>")

# Кэш соответствия сессий книгам (для быстрого поиска даже при конвертации ID в UUID)
BOOK_SESSIONS_MAP: Dict[str, str] = {}

def find_book_context(session_id: str, book_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    target_id = book_id
    if not target_id and session_id in BOOK_SESSIONS_MAP:
        target_id = BOOK_SESSIONS_MAP[session_id]
    if not target_id and session_id.startswith("book_"):
        parts = session_id.split("_")
        if len(parts) >= 3:
            target_id = "_".join(parts[1:-1])
    if target_id:
        book = get_book_by_id(target_id)
        if book:
            return book

    # Если ID не найден напрямую, проверяем по названию сессии или первому сообщению в БД
    try:
        history = db_manager.get_chat_history(session_id, limit=3)
        if history and len(history) > 0:
            first_msg = history[0].get("content", "")
            if "когнитивно-поведенческой терапии" in first_msg or "Бранч" in first_msg or "Роб Уиллсон" in first_msg:
                return get_book_by_id("cbt_workbook_dummies")
            if "Самооцінка" in first_msg or "Шопiн" in first_msg or "Шопин" in first_msg:
                return get_book_by_id("shopin_self_esteem")
            if "Ты есть и этого достаточно" in first_msg or "Макарадзе" in first_msg:
                return get_book_by_id("makaradze_ty_est_dostatochno")
    except Exception as e:
        logger.warning(f"Ошибка поиска контекста книги в истории: {e}")

    return None

@app.post("/api/chat")
def api_chat(req: ChatRequest, _auth: bool = Depends(require_auth)):
    try:
        session_id = req.session_id
        german_context = None
        book_context = find_book_context(session_id, req.book_id)

        # РЕЖИМ СПЕЦИАЛИЗИРОВАННОГО НЕМЕЦКОГО РЕЧЕВОГО КОУЧА
        if req.mode == "german":
            # Изолируем историю немецкого языка, чтобы НЕ сбивать психологическую память и настройки Алины!
            session_id = f"german_live_{req.session_id}"
            lessons = GERMAN_COURSE_DATA.get("lessons", [])
            lesson_id = req.german_lesson_id or 1
            german_lesson = next((l for l in lessons if (l.get("id") == lesson_id or l.get("day") == lesson_id)), lessons[0] if lessons else None)
            if german_lesson:
                german_context = {
                    "title": german_lesson.get("title", ""),
                    "level": german_lesson.get("level", "A1+"),
                    "grammar": german_lesson.get("grammar", ""),
                    "situation": german_lesson.get("dialogue_simulator", {}).get("situation", ""),
                    "vocabulary": german_lesson.get("vocabulary", [])
                }

        history = db_manager.get_chat_history(session_id)
        dossier = db_manager.get_dossier()

        # Сохраняем входящее сообщение
        db_manager.save_message(session_id, "user", req.message)

        # Генерация живого ответа через каскадный роутер
        reply = coach.generate_response(
            req.message,
            history=history,
            dossier=dossier,
            is_voice_mode=req.is_voice_mode,
            german_context=german_context,
            book_context=book_context
        )

        # Сохраняем ответ ассистента
        db_manager.save_message(session_id, "assistant", reply)

        # Для голосового режима: сразу генерируем аудио на сервере в 1 сетевой раундтрип для ультранизкой задержки
        audio_base64 = None
        if req.is_voice_mode and HAS_EDGE_TTS:
            try:
                voice = "de-DE-SeraphinaMultilingualNeural" if (req.mode == "german") else "ru-RU-SvetlanaNeural"
                clean_text = clean_speech_text(reply)
                if clean_text:
                    async def _gen_tts_audio():
                        comm = edge_tts.Communicate(clean_text, voice)
                        st = io.BytesIO()
                        async for chunk in comm.stream():
                            if chunk["type"] == "audio":
                                st.write(chunk["data"])
                        return base64.b64encode(st.getvalue()).decode("utf-8")
                    audio_base64 = asyncio.run(_gen_tts_audio())
            except Exception as tts_err:
                logger.warning(f"Voice mode server-side TTS warning: {tts_err}")

        return {"reply": reply, "audio_base64": audio_base64}
    except Exception as e:
        logger.error(f"Ошибка в /api/chat: {e}")
        return {"reply": f"Солнышко, извини, произошла временная заминка связи: {str(e)}"}

@app.post("/api/chat/stream")
def api_chat_stream(req: ChatRequest, _auth: bool = Depends(require_auth)):
    session_id = req.session_id
    german_context = None
    book_context = find_book_context(session_id, req.book_id)

    if req.mode == "german":
        session_id = f"german_live_{req.session_id}"
        lessons = GERMAN_COURSE_DATA.get("lessons", [])
        lesson_id = req.german_lesson_id or 1
        german_lesson = next((l for l in lessons if (l.get("id") == lesson_id or l.get("day") == lesson_id)), lessons[0] if lessons else None)
        if german_lesson:
            german_context = {
                "title": german_lesson.get("title", ""),
                "level": german_lesson.get("level", "A1+"),
                "grammar": german_lesson.get("grammar", ""),
                "situation": german_lesson.get("dialogue_simulator", {}).get("situation", ""),
                "vocabulary": german_lesson.get("vocabulary", [])
            }

    history = db_manager.get_chat_history(session_id)
    dossier = db_manager.get_dossier()

    db_manager.save_message(session_id, "user", req.message)
    voice = "de-DE-SeraphinaMultilingualNeural" if (req.mode == "german") else "ru-RU-SvetlanaNeural"

    def event_generator():
        sentence_buffer = ""
        full_reply = ""
        chunk_index = 0
        sentence_end_pattern = re.compile(r'([.?!…]+(?:\s+|$))')

        try:
            for token in coach.generate_streaming_response(
                req.message,
                history=history,
                dossier=dossier,
                is_voice_mode=req.is_voice_mode,
                german_context=german_context,
                book_context=book_context
            ):
                sentence_buffer += token
                full_reply += token

                parts = sentence_end_pattern.split(sentence_buffer)
                while len(parts) >= 3:
                    complete_sentence = (parts[0] + parts[1]).strip()
                    sentence_buffer = "".join(parts[2:])

                    if complete_sentence:
                        audio_b64 = None
                        clean_sent = clean_speech_text(complete_sentence)
                        if HAS_EDGE_TTS and clean_sent:
                            try:
                                async def _synthesize():
                                    comm = edge_tts.Communicate(clean_sent, voice)
                                    st = io.BytesIO()
                                    async for c in comm.stream():
                                        if c["type"] == "audio":
                                            st.write(c["data"])
                                    return base64.b64encode(st.getvalue()).decode("utf-8")
                                audio_b64 = asyncio.run(_synthesize())
                            except Exception as e:
                                logger.warning(f"Sentence chunk TTS error: {e}")

                        yield f"data: {json.dumps({'type': 'chunk', 'index': chunk_index, 'text': complete_sentence, 'audio_base64': audio_b64}, ensure_ascii=False)}\n\n"
                        chunk_index += 1

                        if req.is_voice_mode and chunk_index >= 4:
                            break

                    parts = sentence_end_pattern.split(sentence_buffer)
                if req.is_voice_mode and chunk_index >= 4:
                    sentence_buffer = ""
                    break

            tail = sentence_buffer.strip()
            if tail:
                audio_b64 = None
                clean_tail = clean_speech_text(tail)
                if HAS_EDGE_TTS and clean_tail:
                    try:
                        async def _synthesize_tail():
                            comm = edge_tts.Communicate(clean_tail, voice)
                            st = io.BytesIO()
                            async for c in comm.stream():
                                if c["type"] == "audio":
                                    st.write(c["data"])
                            return base64.b64encode(st.getvalue()).decode("utf-8")
                        audio_b64 = asyncio.run(_synthesize_tail())
                    except Exception as e:
                        logger.warning(f"Sentence tail TTS error: {e}")

                yield f"data: {json.dumps({'type': 'chunk', 'index': chunk_index, 'text': tail, 'audio_base64': audio_b64}, ensure_ascii=False)}\n\n"

            db_manager.save_message(session_id, "assistant", full_reply.strip())
            yield f"data: {json.dumps({'type': 'done', 'full_text': full_reply.strip()}, ensure_ascii=False)}\n\n"
        except Exception as gen_err:
            logger.error(f"Event generator error: {gen_err}")
            yield f"data: {json.dumps({'type': 'done', 'full_text': full_reply.strip() or 'Я рядом, солнышко.'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/german")
async def api_german(level: str = "ALL"):
    return get_german_phrases(level)

@app.get('/api/books')
async def api_books():
    return PSYCHOLOGY_BOOKS

@app.get('/api/german/course')
async def api_german_course_data():
    return GERMAN_COURSE_DATA

@app.get("/api/german/card")
async def api_german_card(level: str = "A1"):
    phrases = get_german_phrases(level)
    if phrases:
        return phrases[0]
    return {"level": level, "category": "Общее", "german": "Guten Tag!", "russian": "Добрый день!", "grammar": "Базовое приветствие."}

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    return re.sub(r'[^\w\s]', '', text)

@app.post("/api/german/check")
async def api_german_check(req: GermanCheckRequest):
    user_tr = req.user_translation.strip()
    german_txt = req.german_text.strip()
    sentence_txt = req.sentence.strip()

    if not user_tr:
        return {
            "correct": False,
            "feedback": "Поле перевода пустое. Попробуй перевести фразу на русский язык!"
        }

    # Поиск эталонного перевода в словаре курса
    expected_translation = ""
    lessons = GERMAN_COURSE_DATA.get("lessons", [])
    target_german = normalize_text(german_txt or sentence_txt)

    for lesson in lessons:
        for vocab in lesson.get("vocabulary", []):
            if normalize_text(vocab.get("german", "")) == target_german:
                expected_translation = vocab.get("russian", "")
                break
            if normalize_text(vocab.get("example", "")) == target_german:
                expected_translation = vocab.get("example_translation", vocab.get("russian", ""))
                break
        if expected_translation:
            break

    norm_user = normalize_text(user_tr)
    norm_expected = normalize_text(expected_translation)

    if norm_expected:
        # Точное совпадение
        if norm_user == norm_expected:
            return {
                "correct": True,
                "feedback": f"Великолепно, Алина! Идеальный перевод: «{expected_translation}». Super gemacht! 🎉"
            }
        
        # Пересечение ключевых слов
        user_words = set(norm_user.split())
        expected_words = set(norm_expected.split())
        overlap = user_words.intersection(expected_words)
        ratio = len(overlap) / max(len(expected_words), 1)

        if ratio >= 0.5 or (len(expected_words) <= 2 and len(overlap) >= 1):
            return {
                "correct": True,
                "feedback": f"Отлично! Смысл передан точно: «{expected_translation}». Молодчина! ✨"
            }
        else:
            return {
                "correct": False,
                "feedback": f"Близко, но не совсем точно. Правильный перевод: «{expected_translation}». Попробуй еще раз!"
            }

    # Если в словаре точного совпадения нет, проверяем на осмысленный русский текст
    has_cyrillic = bool(re.search(r'[а-яёА-ЯЁ]', user_tr))
    if has_cyrillic and len(norm_user.split()) >= 1 and len(norm_user) >= 2:
        return {
            "correct": True,
            "feedback": f"Хороший перевод! Ты отлично передала суть фразы '{german_txt or sentence_txt}'. Wunderbar!"
        }

    return {
        "correct": False,
        "feedback": "Кажется, перевод не совсем точный. Напиши перевод на русском языке."
    }

@app.post("/api/german/progress")
async def api_save_german_progress(req: GermanProgressRequest, _auth: bool = Depends(require_auth)):
    db_manager.save_german_progress(req.dict())
    return {"status": "ok", "progress": req.dict()}

@app.get("/api/german/progress")
async def api_get_german_progress(_auth: bool = Depends(require_auth)):
    return db_manager.get_german_progress()

@app.get("/api/library")
async def api_library(q: str = None):
    items = get_library_items()
    if q:
        q_lower = q.lower()
        items = [i for i in items if q_lower in i["title"].lower() or q_lower in i["author"].lower() or q_lower in i["excerpt"].lower()]
    return items

@app.get("/api/books/psychology")
async def api_psychology_books():
    return get_psychology_books()

def clean_speech_text(text: str) -> str:
    """Очищает текст от Markdown разметки, звездочек и спецсимволов перед отправкой в TTS."""
    if not text:
        return ""
    # Убираем жирный/курсивный markdown (**слово**, *слово*, __слово__, _слово_)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    # Убираем оставшиеся звёздочки, решётки, тильды и обратные кавычки
    text = text.replace('*', '').replace('#', '').replace('~', '').replace('`', '')
    # Убираем эмодзи и спец-глифы
    text = re.sub(r'[\U00010000-\U0010ffff]', '', text)
    text = re.sub(r'[\u2600-\u26ff\u2700-\u27bf]', '', text)
    # Нормализуем кавычки и тире
    text = text.replace('«', '"').replace('»', '"').replace('—', ' - ').replace('–', ' - ')
    return re.sub(r'\s+', ' ', text).strip()

@app.post("/api/voice/tts")
async def api_tts(req: TTSRequest):
    if not HAS_EDGE_TTS:
        raise HTTPException(status_code=500, detail="edge-tts не установлена")
    
    try:
        clean_text = clean_speech_text(req.text)
        if not clean_text:
            return Response(content=b"", media_type="audio/mpeg")
            
        voice = req.voice or "ru-RU-SvetlanaNeural"
        communicate = edge_tts.Communicate(clean_text, voice)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        audio_stream.seek(0)
        return Response(content=audio_stream.read(), media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/save")
def api_voice_save(req: VoiceSaveRequest, _auth: bool = Depends(require_auth)):
    try:
        binary_data = base64.b64decode(req.audio_base64)
        file_url = s3_storage.upload_file_bytes(binary_data, req.filename)
        if not file_url:
            raise HTTPException(status_code=500, detail="Не удалось загрузить файл в S3 Storj хранилище")
        return {"status": "success", "url": file_url}
    except Exception as e:
        logger.error(f"Voice Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    ai_active = bool(coach.ag_client or coach.genai_client)
    return {"status": "healthy", "ai_active": ai_active, "supabase_active": bool(db_manager.client)}

class DossierUpdateRequest(BaseModel):
    name: str = "Алина"
    notes: str = ""

@app.get("/api/dossier")
def api_get_dossier(_auth: bool = Depends(require_auth)):
    return db_manager.get_dossier()

@app.post("/api/dossier")
def api_save_dossier(req: DossierUpdateRequest, _auth: bool = Depends(require_auth)):
    db_manager.save_dossier(req.name, req.notes)
    return {"status": "ok", "message": "Досье сохранено"}

@app.get("/api/chat/history")
def api_chat_history(session_id: str = "default_wife", _auth: bool = Depends(require_auth)):
    return db_manager.get_chat_history(session_id)

@app.get("/api/sessions")
def api_get_sessions(_auth: bool = Depends(require_auth)):
    return db_manager.get_chat_sessions()

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Новый диалог с Алиной"

@app.post("/api/sessions")
def api_create_session(req: Optional[CreateSessionRequest] = None, _auth: bool = Depends(require_auth)):
    new_id = f"alina_{uuid.uuid4().hex[:12]}"
    title = req.title if req and req.title else "Новый диалог с Алиной"
    db_manager.save_message(new_id, "assistant", "Здравствуй, дорогая Алина! Я рядом, о чём ты сейчас думаешь?")
    return {"id": new_id, "title": title}

class BookSessionRequest(BaseModel):
    book_id: str

@app.post("/api/sessions/book")
def api_create_book_session(req: BookSessionRequest, _auth: bool = Depends(require_auth)):
    book = get_book_by_id(req.book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Книга не найдена")
    raw_id = f"book_{book['id']}_{uuid.uuid4().hex[:8]}"
    title = f"📖 {book['title'][:35]}"
    b_title = book["title"]
    b_author = book["author"]
    b_desc = book["description"]
    intro = (
        f"Здравствуй, дорогая Алина! ✨ Мы открыли персональный диалог для обсуждения книги «{b_title}» ({b_author}).\n\n"
        f"Я знаю ключевые методики, инсайты и практические упражнения из этой книги.\n\n"
        f"💡 **Суть книги:** {b_desc}\n\n"
        f"О чём из этой книги тебе сейчас больше всего хочется поговорить? Какую тему или упражнение разберём?"
    )
    BOOK_SESSIONS_MAP[raw_id] = book["id"]
    try:
        sess_uuid = db_manager._to_uuid(raw_id)
        BOOK_SESSIONS_MAP[sess_uuid] = book["id"]
    except Exception:
        pass

    db_manager.save_message(raw_id, "assistant", intro, title=title)
    return {"id": raw_id, "title": title, "book_id": book["id"], "greeting": intro}

@app.delete("/api/sessions/{session_id}")
def api_delete_session(session_id: str, _auth: bool = Depends(require_auth)):
    success = db_manager.delete_chat_session(session_id)
    return {"status": "ok" if success else "error"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, timeout_keep_alive=65)
