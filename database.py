import os
import uuid
import json
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
            "name": "Алина",
            "age": 35,
            "birthday": "25 сентября",
            "nationality": "Украинка (родом из Украины)",
            "husband": "Роман",
            "role": "Любимая жена Романа",
            "notes": "Алина — украинка, 35 лет (день рождения 25 сентября). Любящий муж Роман искренне заботится о ней. Изучает немецкий язык (цель — уверенный уровень B1). Нуждается в глубокой, профессиональной психологической поддержке без инфантилизма: снятие тревоги, перегрузки, опора на безусловную ценность, когнитивная реструктуризация и транзактный анализ.",
            "preferences": {"tea": "Мятный и жасминовый чай", "comfort": "Уютный плед, тишина, уважительное общение"},
            "goals": ["Свободное владение немецким языком B1", "Эмоциональное спокойствие и уверенность", "Гармоничные, теплые отношения с мужем Романом"]
        }
        if not self.client:
            return default_data
        try:
            res = self.client.table("wife_dossier").select("*").execute()
            if res.data and len(res.data) > 0:
                result = dict(default_data)
                for item in res.data:
                    k = item.get("key_name")
                    v = item.get("value")
                    if k == "Имя" and v:
                        result["name"] = v
                    elif k == "Возраст" and v:
                        result["age"] = v
                    elif k == "День рождения" and v:
                        result["birthday"] = v
                    elif k == "Происхождение" and v:
                        result["nationality"] = v
                    elif k == "Муж" and v:
                        result["husband"] = v
                    elif k == "Заметки" and v:
                        result["notes"] = v
                    elif k == "intake_profile" and v:
                        try:
                            result["intake_profile"] = json.loads(v) if isinstance(v, str) else v
                            result["intake_completed"] = True
                        except Exception:
                            pass
                
                # Также подгружаем из локального файла памяти
                mem_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "alina_memory_profile.json")
                if os.path.exists(mem_file):
                    try:
                        with open(mem_file, "r", encoding="utf-8") as mf:
                            mem_data = json.load(mf)
                            if "intake_profile" in mem_data and "intake_profile" not in result:
                                result["intake_profile"] = mem_data["intake_profile"]
                                result["intake_completed"] = mem_data.get("intake_completed", True)
                    except Exception:
                        pass
                return result
        except Exception as e:
            logger.error(f"Ошибка чтения досье из Supabase: {e}")

        # Если Supabase недоступен — возвращаем из локального файла
        result = dict(default_data)
        mem_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "alina_memory_profile.json")
        if os.path.exists(mem_file):
            try:
                with open(mem_file, "r", encoding="utf-8") as mf:
                    mem_data = json.load(mf)
                    if "intake_profile" in mem_data:
                        result["intake_profile"] = mem_data["intake_profile"]
                        result["intake_completed"] = mem_data.get("intake_completed", True)
            except Exception:
                pass
        return result

    def save_intake_profile(self, intake_data: Dict[str, Any]) -> None:
        """Сохранение персональной психологической анкеты Алины в файл памяти и Supabase"""
        mem_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "alina_memory_profile.json")
        try:
            profile = {}
            if os.path.exists(mem_file):
                with open(mem_file, "r", encoding="utf-8") as mf:
                    profile = json.load(mf)
            profile["intake_completed"] = True
            profile["intake_profile"] = intake_data
            with open(mem_file, "w", encoding="utf-8") as mf:
                json.dump(profile, mf, ensure_ascii=False, indent=2)
            logger.info("Психологическая анкета сохранена в alina_memory_profile.json")
        except Exception as e:
            logger.error(f"Ошибка сохранения анкеты в файл: {e}")

        if self.client:
            try:
                self.client.table("wife_dossier").upsert([
                    {"category": "intake", "key_name": "intake_profile", "value": json.dumps(intake_data, ensure_ascii=False), "importance": 5}
                ]).execute()
                logger.info("Психологическая анкета сохранена в Supabase")
            except Exception as e:
                logger.error(f"Ошибка сохранения анкеты в Supabase: {e}")

    def update_daily_energy(self, energy_level: str, note: Optional[str] = "") -> Dict[str, Any]:
        """Быстрое 1-таповое обновление текущего уровня энергии Алины (адаптация сессии на лету)"""
        mem_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "alina_memory_profile.json")
        profile: Dict[str, Any] = {}
        try:
            if os.path.exists(mem_file):
                with open(mem_file, "r", encoding="utf-8") as mf:
                    profile = json.load(mf)
            
            if "intake_profile" not in profile:
                profile["intake_profile"] = {}
            
            profile["intake_profile"]["energy_level"] = energy_level
            if note:
                profile["intake_profile"]["energy_note"] = note
            
            with open(mem_file, "w", encoding="utf-8") as mf:
                json.dump(profile, mf, ensure_ascii=False, indent=2)
            logger.info(f"Уровень энергии Алины обновлен: {energy_level}")
        except Exception as e:
            logger.error(f"Ошибка обновления энергии в файле: {e}")

        intake = profile.get("intake_profile", {"energy_level": energy_level})
        if self.client:
            try:
                self.client.table("wife_dossier").upsert([
                    {"category": "intake", "key_name": "intake_profile", "value": json.dumps(intake, ensure_ascii=False), "importance": 5}
                ]).execute()
                logger.info("Обновление энергии синхронизировано с Supabase")
            except Exception as e:
                logger.warning(f"Ошибка синхронизации энергии с Supabase: {e}")

        return intake

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

    def add_insight_to_dossier(self, insight: str) -> bool:
        if not self.client:
            return False
        try:
            curr = self.get_dossier()
            notes = curr.get("notes", "")
            clean = insight.strip().replace("\n", " ")
            if len(clean) > 220:
                clean = clean[:217] + "..."
            updated_notes = f"{notes}\n⭐ Опора: {clean}".strip()
            self.save_dossier(curr.get("name", "Алина"), updated_notes)
            return True
        except Exception as e:
            logger.error(f"Ошибка сохранения инсайта в досье: {e}")
            return False

    def save_message(self, session_id: str, role: str, content: str, title: Optional[str] = None) -> None:
        if not self.client:
            return
        try:
            sess_uuid = self._to_uuid(session_id)
            try:
                # Проверяем, существует ли уже эта сессия
                existing = self.client.table("chat_sessions").select("id").eq("id", sess_uuid).execute()
                if not existing.data:
                    session_title = title if title else (content[:45] if role == "user" else "Диалог с Алиной")
                    self.client.table("chat_sessions").insert({
                        "id": sess_uuid,
                        "title": session_title
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

    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict[str, str]]:
        if not self.client:
            return []
        try:
            sess_uuid = self._to_uuid(session_id)
            res = self.client.table("chat_messages").select("role, content, created_at").eq("session_id", sess_uuid).order("created_at", desc=False).limit(limit).execute()
            if res.data:
                return [{"role": r["role"], "content": r["content"]} for r in res.data]
        except Exception as e:
            logger.error(f"Ошибка получения истории чата из Supabase: {e}")
        return []

    def get_chat_sessions(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Возвращает список всех сохраненных сессий для ChatGPT-интерфейса"""
        if not self.client:
            return []
        try:
            res = self.client.table("chat_sessions").select("id, title, created_at").order("created_at", desc=True).limit(limit).execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Ошибка получения сессий из Supabase: {e}")
            return []

    def delete_chat_session(self, session_id: str) -> bool:
        if not self.client:
            return False
        try:
            sess_uuid = self._to_uuid(session_id)
            self.client.table("chat_messages").delete().eq("session_id", sess_uuid).execute()
            self.client.table("chat_sessions").delete().eq("id", sess_uuid).execute()
            return True
        except Exception as e:
            logger.error(f"Ошибка удаления сессии: {e}")
            return False

    def save_german_progress(self, progress: Dict[str, Any]) -> bool:
        """Сохраняет прогресс Lingo (XP, жизни, стрик) в Supabase"""
        if not self.client:
            return False
        try:
            self.client.table("wife_dossier").upsert([
                {"key_name": "Lingo_XP", "value": str(progress.get("xp", 0))},
                {"key_name": "Lingo_Hearts", "value": str(progress.get("hearts", 5))},
                {"key_name": "Lingo_Streak", "value": str(progress.get("streak", 1))},
                {"key_name": "Lingo_LastLesson", "value": str(progress.get("lesson_id", 1))},
            ]).execute()
            return True
        except Exception as e:
            logger.warning(f"Ошибка сохранения прогресса Lingo в Supabase: {e}")
            return False

    def get_german_progress(self) -> Dict[str, Any]:
        """Загружает прогресс Lingo (XP, жизни, стрик) из Supabase"""
        default_res = {"xp": 0, "hearts": 5, "streak": 1, "lesson_id": 1}
        if not self.client:
            return default_res
        try:
            res = self.client.table("wife_dossier").select("*").in_("key_name", ["Lingo_XP", "Lingo_Hearts", "Lingo_Streak", "Lingo_LastLesson"]).execute()
            if res.data:
                for row in res.data:
                    k = row.get("key_name")
                    v = row.get("value")
                    if k == "Lingo_XP" and v: default_res["xp"] = int(v)
                    elif k == "Lingo_Hearts" and v: default_res["hearts"] = int(v)
                    elif k == "Lingo_Streak" and v: default_res["streak"] = int(v)
                    elif k == "Lingo_LastLesson" and v: default_res["lesson_id"] = int(v)
            return default_res
        except Exception as e:
            return default_res

    def keepalive_ping(self) -> bool:
        """Анти-засыпание базы Supabase (предотвращает спящий режим)"""
        if not self.client:
            return False
        try:
            res = self.client.table("wife_dossier").select("key_name").limit(1).execute()
            logger.info("Supabase keepalive ping: OK")
            return True
        except Exception as e:
            logger.warning(f"Supabase keepalive ping failed: {e}")
            return False

db_manager = SupabaseManager()
