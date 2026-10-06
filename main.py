import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from database import get_supabase
from coach import coach_service
from german import GermanTrainer
from library import LibraryService
from tasks import TaskTracker

app = FastAPI(title="AI Wife Coach - Суверенный ИИ-Муж и Коуч", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

german_trainer = GermanTrainer()
library_service = LibraryService()
task_tracker = TaskTracker()

@app.get("/health")
def health():
    return {"status": "ok", "project": "ai-wife-coach"}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        result = coach_service.get_empathetic_response(req.message, req.session_id)
        db = get_supabase()
        if db and result.get("session_id"):
            sid = result["session_id"]
            try:
                sess_check = db.table("chat_sessions").select("id").eq("id", sid).execute()
                if not sess_check.data:
                    db.table("chat_sessions").insert({"id": sid, "title": req.message[:30] + "..."}).execute()
                
                db.table("chat_messages").insert([
                    {"session_id": sid, "role": "user", "content": req.message},
                    {"session_id": sid, "role": "assistant", "content": result["reply"], "validation": result["validation"], "gentle_question": result["gentle_question"]}
                ]).execute()
            except Exception as db_err:
                print(f"Supabase chat save error: {db_err}")

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions")
def get_sessions():
    db = get_supabase()
    if not db:
        return []
    try:
        res = db.table("chat_sessions").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        return []

@app.get("/api/sessions/{session_id}/messages")
def get_session_messages(session_id: str):
    db = get_supabase()
    if not db:
        return []
    try:
        res = db.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return res.data or []
    except Exception as e:
        return []

@app.get("/api/dossier")
def get_dossier():
    db = get_supabase()
    if not db:
        return [{"category": "info", "key_name": "Статус", "value": "Supabase не подключен"}]
    try:
        res = db.table("wife_dossier").select("*").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# German API
@app.get("/api/german/card")
def get_german_card(level: str = "A1"):
    return german_trainer.get_card(level)

class GermanCheckRequest(BaseModel):
    level: str
    german_text: str
    user_translation: str

@app.post("/api/german/check")
def check_german(req: GermanCheckRequest):
    return german_trainer.check_translation(req.level, req.german_text, req.user_translation)

# Library API
@app.get("/api/books")
def get_books():
    return library_service.list_books()

# Tasks API
@app.get("/api/tasks")
def get_tasks():
    return task_tracker.get_tasks()

class TaskCreateRequest(BaseModel):
    title: str
    category: Optional[str] = "Забота"

@app.post("/api/tasks")
def add_task(req: TaskCreateRequest):
    return task_tracker.add_task(req.title, req.category)

@app.post("/api/tasks/{task_id}/toggle")
def toggle_task(task_id: str):
    return task_tracker.toggle_task(task_id)

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    return task_tracker.delete_task(task_id)

if os.path.exists("static"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
