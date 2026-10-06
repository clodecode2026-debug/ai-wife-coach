import os
import logging
from typing import Optional

logger = logging.getLogger("ai_wife_coach.database")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Supabase init error: {e}")
        supabase = None
else:
    logger.warning("Supabase credentials not found in environment variables. Operating in local mode.")

def get_supabase():
    return supabase

# Fallback in-memory storage for offline / testing mode
LOCAL_DB = {
    "wife_dossier": [],
    "chat_sessions": [{"id": "default-session", "title": "Основной чат", "summary": "Начальный чат"}],
    "chat_messages": [],
    "care_tasks": [
        {"id": "1", "title": "Сделать любимый лавандовый чай", "category": "Забота", "completed": False},
        {"id": "2", "title": "Обнять и сказать нежные слова", "category": "Внимание", "completed": True},
        {"id": "3", "title": "Подарить цветок без повода", "category": "Сюрприз", "completed": False}
    ],
    "library_books": [
        {"id": "1", "title": "Пять языков любви", "author": "Гэри Чепмен", "category": "Психология отношений", "excerpt": "Понимание того, как ваша жена принимает любовь, творит чудеса."},
        {"id": "2", "title": "Искусство любить", "author": "Эрих Фромм", "category": "Философия", "excerpt": "Любовь — это активная заинтересованность в жизни и развитии того, кого мы любим."}
    ]
}

# Helper functions for database operations with fallback
async def db_get_dossier():
    if supabase:
        try:
            res = supabase.table("wife_dossier").select("*").execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error fetching dossier: {e}")
    return LOCAL_DB["wife_dossier"]

async def db_add_dossier_fact(category: str, key_name: str, value: str, importance: int = 3):
    item = {"category": category, "key_name": key_name, "value": value, "importance": importance}
    if supabase:
        try:
            res = supabase.table("wife_dossier").insert(item).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.error(f"Supabase error adding dossier: {e}")
    # Local fallback
    item["id"] = str(len(LOCAL_DB["wife_dossier"]) + 1)
    LOCAL_DB["wife_dossier"].append(item)
    return item

async def db_get_sessions():
    if supabase:
        try:
            res = supabase.table("chat_sessions").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error fetching sessions: {e}")
    return LOCAL_DB["chat_sessions"]

async def db_create_session(title: str = "Новый разговор"):
    item = {"title": title}
    if supabase:
        try:
            res = supabase.table("chat_sessions").insert(item).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.error(f"Supabase error creating session: {e}")
    # Local fallback
    import uuid
    new_id = str(uuid.uuid4())
    session = {"id": new_id, "title": title}
    LOCAL_DB["chat_sessions"].insert(0, session)
    return session

async def db_get_messages(session_id: str):
    if supabase:
        try:
            res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at").execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error fetching messages: {e}")
    return [m for m in LOCAL_DB["chat_messages"] if m.get("session_id") == session_id]

async def db_add_message(session_id: str, role: str, content: str, validation: str = "", gentle_question: str = ""):
    item = {
        "session_id": session_id,
        "role": role,
        "content": content,
        "validation": validation,
        "gentle_question": gentle_question
    }
    if supabase:
        try:
            res = supabase.table("chat_messages").insert(item).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.error(f"Supabase error adding message: {e}")
    LOCAL_DB["chat_messages"].append(item)
    return item

async def db_get_tasks():
    if supabase:
        try:
            res = supabase.table("care_tasks").select("*").execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error fetching tasks: {e}")
    return LOCAL_DB["care_tasks"]

async def db_toggle_task(task_id: str, completed: bool):
    if supabase:
        try:
            res = supabase.table("care_tasks").update({"completed": completed}).eq("id", task_id).execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error toggling task: {e}")
    for t in LOCAL_DB["care_tasks"]:
        if t["id"] == task_id:
            t["completed"] = completed
            return t
    return None

async def db_get_books():
    if supabase:
        try:
            res = supabase.table("library_books").select("*").execute()
            return res.data
        except Exception as e:
            logger.error(f"Supabase error fetching books: {e}")
    return LOCAL_DB["library_books"]
