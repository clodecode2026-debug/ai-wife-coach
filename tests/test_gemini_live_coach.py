import pytest
from starlette.testclient import TestClient
from main import app
from gemini_live_coach import (
    get_gemini_api_keys,
    SYSTEM_PROMPTS,
    DEFAULT_VOICES,
    SUPPORTED_VOICES,
    DEFAULT_SILENCE_WAIT,
    GERMAN_SLOW_PROMPT_ADDITION
)

def test_gemini_live_config():
    keys = get_gemini_api_keys()
    assert len(keys) > 0, "At least one Gemini API key must be available"
    assert "coach" in SYSTEM_PROMPTS
    assert "german" in SYSTEM_PROMPTS
    assert DEFAULT_VOICES.get("coach") == "Aoede"
    assert "Aoede" in SUPPORTED_VOICES
    assert "Kore" in SUPPORTED_VOICES
    assert "Fenrir" in SUPPORTED_VOICES
    
    # Проверка таймингов ожидания тишины (VAD)
    assert DEFAULT_SILENCE_WAIT["coach"] == 1.5, "Coach silence wait must be 1.5 seconds"
    assert DEFAULT_SILENCE_WAIT["german"] == 2.0, "German silence wait must be 2.0 seconds"
    assert "VERLANGSAMTEN" in GERMAN_SLOW_PROMPT_ADDITION

def test_gemini_live_websocket_endpoint():
    client = TestClient(app)
    with client.websocket_connect("/api/voice/live") as ws:
        # Check initial state or send init payload
        ws.send_json({"type": "init", "mode": "coach", "voice": "Aoede"})
        ws.close()

from unittest.mock import patch, AsyncMock

def test_gemini_live_websocket_start_and_update():
    client = TestClient(app)
    mock_ws = AsyncMock()
    mock_ws.recv = AsyncMock(side_effect=['{"setupComplete": {}}', Exception("mock end")])
    mock_ws.send = AsyncMock()
    mock_ws.close = AsyncMock()

    with patch("gemini_live_coach.websockets.connect", new=AsyncMock(return_value=mock_ws)):
        with client.websocket_connect("/api/voice/live") as ws:
            # 1. Проверяем старт режима коуча с дефолтной тишиной 1.5с
            ws.send_json({"type": "start", "mode": "coach", "voice": "Aoede"})
            resp = ws.receive_json()
            assert resp["type"] == "ready"
            assert resp["mode"] == "coach"
            assert resp["silence_wait_sec"] == 1.5
            assert resp["slow_mode"] is False

            # 2. Проверяем обновление параметров на лету
            ws.send_json({"type": "update_config", "silence_wait_sec": 2.5, "slow_mode": True})
            update_resp = ws.receive_json()
            assert update_resp["type"] == "config_updated"
            assert update_resp["silence_wait_sec"] == 2.5
            assert update_resp["slow_mode"] is True
            ws.close()
