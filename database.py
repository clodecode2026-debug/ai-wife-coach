import os
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Пробуем импортировать supabase клиент
try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    logger.warning("Библиотека supabase не установлена. Работаем в офлайн/локальном режиме.")

class SupabaseManager:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_KEY")
        self.client: Optional[Any] = None
        
        if HAS_SUPABASE and self.url and self.key:
            try:
                self.client = create_client(self.url, self.key)
                logger.info("Supabase клиент успешно инициализирован")
            except Exception as e:
                logger.error(f"Не удалось инициализировать Supabase: {e}")

    def get_dossier(self, user_id: str = "default_wife") -> Dict[str, Any]:
        if not self.client:
            return {
                "name": "Любимая Женечка",
                "preferences": {"tea": "Жасминовый зеленый", "comfort": "Плед и тишина"},
                "triggers": ["Спешка по утрам", шум],
                "goals": ["Изучение немецкого B2", "Гармония и баланс"]
            }
        try:
            res = self.client.table("wife_dossier").select("*").eq("user_id", user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0].get("dossier_data", {})
        except Exception as e:
            logger.error(f"Ошибка чтения досье из Supabase: {e}")
        return {}

    def save_message(self, session_id: str, role: str, content: str) -> None:
        if not self.client:
            return
        try:
            self.client.table("chat_messages").insert({
                "session_id": session_id,
                "role": role,
                "content": content
            }).execute()
        except Exception as e:
            logger.error(f"Ошибка сохранения сообщения в Supabase: {e}")

    def get_chat_history(self, session_id: str, limit: int = 15) -> List[Dict[str, str]]:
        if not self.client:
            return []
        try:
            res = self.client.table("chat_messages").select("role, content").eq("session_id", session_id).order("created_at", desc=False).limit(limit).execute()
            if res.data:
                return res.data
        except Exception as e:
            logger.error(f"Ошибка получения истории чата из Supabase: {e}")
        return []


    def save_dossier(self, name: str, notes: str, user_id: str = "default_wife") -> None:
        if not self.client:
            return
        try:
            dossier_data = {
                "name": name,
                "notes": notes,
                "preferences": {"tea": "Жасминовый зеленый", "comfort": "Плед и тишина"},
                "goals": ["Изучение немецкого B2", "Гармония и баланс"]
            }
            self.client.table("wife_dossier").upsert({
                "user_id": user_id,
                "dossier_data": dossier_data
            }, on_conflict="user_id").execute()
            logger.info("Досье успешно сохранено в Supabase")
        except Exception as e:
            logger.error(f"Ошибка сохранения досье в Supabase: {e}")

db_manager = SupabaseManager()
