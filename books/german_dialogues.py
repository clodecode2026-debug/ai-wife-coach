import os
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

DIALOGUES_JSON_PATH = os.path.join(os.path.dirname(__file__), "german_dialogues.json")

def load_german_dialogues_from_file() -> Dict[str, Any]:
    if os.path.exists(DIALOGUES_JSON_PATH):
        try:
            with open(DIALOGUES_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info(f"Успешно загружено {len(data.get('dialogues', []))} диалогов немецкого языка.")
                return data
        except Exception as e:
            logger.error(f"Ошибка загрузки german_dialogues.json: {e}")
    return {"total": 0, "dialogues": []}

GERMAN_DIALOGUES_DATA = load_german_dialogues_from_file()

def get_german_dialogues() -> Dict[str, Any]:
    return GERMAN_DIALOGUES_DATA

def get_dialogue_by_id(dialogue_id: str) -> Optional[Dict[str, Any]]:
    dialogues = GERMAN_DIALOGUES_DATA.get("dialogues", [])
    for d in dialogues:
        if d.get("id") == dialogue_id:
            return d
    return None

def get_dialogues_by_category(category: str) -> List[Dict[str, Any]]:
    dialogues = GERMAN_DIALOGUES_DATA.get("dialogues", [])
    if not category or category.lower() == "all":
        return dialogues
    return [d for d in dialogues if d.get("category") == category]
