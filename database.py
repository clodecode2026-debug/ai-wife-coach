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
                if name_entry:
                    result["name"] = name_entry.get("value")
                if notes_entry:
                    result["notes"] = notes_entry.get("value")
                return result
        except Exception as e:
            logger.error(f"Ошибка чтения досье из Supabase: {e}")
        return default_data

db_manager = SupabaseManager()
