import os
import uuid
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

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

    def _to_uuid(self, session_id: str) -> str:
        try:
            return str(uuid.UUID(session_id))
        except (ValueError, AttributeError):
            return str(uuid.uuid5(uuid.NAMESPACE_DNS, str(session_id)))

    def get_dossier(self, user_id: str = "default_wife") -> Dict[str, Any]:
        default_data = {
            "name": "Анечка (Любимая жена)",
            "notes": "Практикует немецкий язык, ценит бережную поддержку и интересуется экзистенциальной психологией",
            "preferences": {"tea": "Жасминовый зеленый", "comfort": "Плед и тишина"},
            "goals": ["Изучение немецкого B2", "Гармония и баланс"]
        }
        if not self.client:
            return default_data
        try:
            res = self.client.table("wife_dossier").select("*").execute()
            if res.data and len(res.data) > 0:
                name_entry = next((r for r in res.data if r.get("key_name") == "Имя"), None)
                notes_entry = next((r for r in res.data if r.get("key_name") == "Заметки"), None)
                result = dict(default_data)
                if name_entry and name_entry.get("value"):
                    result["name"] = name_entry.get("value")
                if notes_entry and notes_entry.get("value"):
                    result["notes"] = notes_entry.get("value")
                return result
        except Exception as e:
            logger.error(f"Ошибка чтения досье из Supabase: {e}")
        return default_data

    def save_dossier(self, name: str, notes: str, user_id: str = "default_wife") -> None:
        if not self.client:
            return
        try:
            self.client.table("wife_dossier").upsert([
                {"category": "profile", "key_name": "Имя", "value": name, "importance": 5},
                {"category": "profile", "key_name": "Заметки", "value": notes, "importance": 5}
            ]).execute()
            logger.info("Досье успешно сохранено в Supabase")
        except Exception as e:
            logger.error(f"Ошибка сохранения досье в Supabase: {e}")

    def save_message(self, session_id: str, role: str, content: str) -> None:
        if not self.client:
            return
        try:
            sess_uuid = self._to_uuid(session_id)
            try:
                self.client.table("chat_sessions").upsert({
                    "id": sess_uuid,
                    "title": content[:40] if role == "user" else "Диалог с любимой"
                }).execute()
            except Exception as err_s:
                logger.warning(f"Upsert chat_sessions notice: {err_s}")

            self.client.table("chat_messages").insert({
                "session_id": sess_uuid,
                "role": role,
                "content": content
            }).execute()
            logger.info(f"Сообщение {role} успешно сохранено в Supabase")
        except Exception as e:
            logger.error(f"Ошибка сохранения сообщения в Supabase: {e}")

    def get_chat_history(self, session_id: str, limit: int = 25) -> List[Dict[str, str]]:
        if not self.client:
            return []
        try:
            sess_uuid = self._to_uuid(session_id)
            res = self.client.table("chat_messages").select("role, content").eq("session_id", sess_uuid).order("created_at", desc=False).limit(limit).execute()
            if res.data:
                return res.data
        except Exception as e:
            logger.error(f"Ошибка получения истории чата из Supabase: {e}")
        return []

db_manager = SupabaseManager()
