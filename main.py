import os
import io
import logging
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
import uvicorn

# Импорты наших модулей
from coach import coach
from database import db_manager
from german import get_german_phrases
from library import get_library_items

# Попытка импорта edge-tts
try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Wife Coach", version="2.0.0")

# Монтируем статику
app.mount("/static", StaticFiles(directory="static"), name="static")

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

class TTSRequest(BaseModel):
    text: str
    voice: str = "ru-RU-SvetlanaNeural"

@app.get("/", response_class=HTMLResponse)
async def read_index():
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        return HTMLResponse(content=f"<h1>AI Wife Coach</h1><p>Ошибка загрузки интерфейса: {e}</p>")

@app.post("/api/chat")
async def api_chat(req: ChatRequest):
    try:
        # Получаем историю и досье из Supabase
        history = db_manager.get_chat_history(req.session_id)
        dossier = db_manager.get_dossier()

        # Сохраняем сообщение пользователя
        db_manager.save_message(req.session_id, "user", req.message)

        # Генерируем ответ через Gemini (coach.py)
        reply = coach.generate_response(req.message, history=history, dossier=dossier)

        # Сохраняем ответ модели
        db_manager.save_message(req.session_id, "assistant", reply)

        return {"reply": reply}
    except Exception as e:
        logger.error(f"Ошибка в /api/chat: {e}")
        return {"reply": f"Солнышко, извини, произошла внутренняя ошибка: {str(e)}"}

@app.get("/api/german")
async def api_german(level: str = "ALL"):
    return get_german_phrases(level)

@app.get("/api/library")
async def api_library():
    return get_library_items()

@app.post("/api/voice/tts")
async def api_tts(req: TTSRequest):
    if not HAS_EDGE_TTS:
        raise HTTPException(status_code=500, detail="edge-tts не установлена")
    
    try:
        communicate = edge_tts.Communicate(req.text, req.voice)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        audio_stream.seek(0)
        return Response(content=audio_stream.read(), media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "gemini_active": bool(coach.client), "supabase_active": bool(db_manager.client)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
