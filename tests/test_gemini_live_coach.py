import pytest
from starlette.testclient import TestClient
from main import app
from gemini_live_coach import get_gemini_api_keys, SYSTEM_PROMPTS, DEFAULT_VOICES, SUPPORTED_VOICES

def test_gemini_live_config():
    keys = get_gemini_api_keys()
    assert len(keys) > 0, "At least one Gemini API key must be available"
    assert "coach" in SYSTEM_PROMPTS
    assert "german" in SYSTEM_PROMPTS
    assert DEFAULT_VOICES.get("coach") == "Aoede"
    assert "Aoede" in SUPPORTED_VOICES
    assert "Kore" in SUPPORTED_VOICES
    assert "Fenrir" in SUPPORTED_VOICES

def test_gemini_live_websocket_endpoint():
    client = TestClient(app)
    with client.websocket_connect("/api/voice/live") as ws:
        # Check initial state or send init payload
        ws.send_json({"type": "init", "mode": "coach", "voice": "Aoede"})
        ws.close()
