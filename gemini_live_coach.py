#!/usr/bin/env python3
"""
gemini_live_coach.py
--------------------------------------------------------------------------------
Готовый боевой WebSocket-модуль Gemini Multimodal Live API для проекта "AI Коуч для Жены".
Подключается в FastAPI одной строчкой:
    from gemini_live_coach import router as gemini_live_router
    app.include_router(gemini_live_router)

ОСОБЕННОСТИ И КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ:
1. РЕШЕНА ПРОБЛЕМА МОЛЧАНИЯ: использует интеллектуальный серверный VAD + clientContent turnComplete
   (сырой поток realtimeInput игнорировался моделью без заголовков сессии).
2. ДВА РЕЖИМА:
   - "coach" (Психологическая поддержка, эмпатичный коучинг, голос Aoede/Kore)
   - "german" (Живой разговорный тренажер немецкого A1-B2 с мягкой коррекцией)
3. ПОДДЕРЖКА МОБИЛЬНЫХ: 16кГц PCM на входе, 24кГц PCM на выходе.
4. ЗАЩИТА ОТ ОБРЫВОВ И ЛИМИТОВ: поддержка нескольких ключей API (Free + Paid fallback).
--------------------------------------------------------------------------------
"""

import os
import json
import asyncio
import base64
import struct
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

router = APIRouter(prefix="/api/voice", tags=["Gemini Live Voice"])

GEMINI_LIVE_MODEL = "models/gemini-3.8-live"

# Сбор доступных API ключей из окружения
def get_gemini_api_keys() -> List[str]:
    keys = []
    for var in ["GEMINI_API_KEY", "GEMINI_PAID_API_KEY", "GOOGLE_API_KEY"]:
        val = os.environ.get(var, "").strip()
        if val and val not in keys:
            keys.append(val)
    # Запасной бесплатный ключ по умолчанию
    fallback_default = "AIzaSyB8_5q2Pe7Tio8j5E8g0cs7mtaO_A9eTWU"
    if fallback_default not in keys:
        keys.append(fallback_default)
    return keys

# Системные промпты под два сценария
SYSTEM_PROMPTS = {
    "coach": (
        "Ты — заботливый, мудрый и тёплый личный AI-коуч и психолог для девушки по имени Алина. "
        "Твой стиль общения: живой, поддерживающий, чуткий, мягкий, без канцеляризмов и длинных лекций. "
        "Ты общаешься ГОЛОСОМ в реальном времени на русском языке. "
        "Твоя задача — внимательно слушать, задавать точные вопросы, помогать структурировать мысли, "
        "экологично справляться со стрессом, повышать самооценку и находить внутренние ресурсы. "
        "Отвечай кратко, емко (1-3 живых предложения), оставляя пространство для её ответа."
    ),
    "german": (
        "Du bist ein geduldiger, freundlicher und motivierender Deutschlehrer und Gesprächspartner für Alina. "
        "Dein Ziel ist es, ihr zu helfen, Deutsch im Alltag fließend und ohne Angst zu sprechen (Niveau A1-B2). "
        "Sprich lebendig, langsam, klar und mit einfacher Alltagssprache auf Deutsch. "
        "Wenn sie Fehler macht, korrigiere sie ganz sanft und wiederhole den richtigen Satz. "
        "Wenn sie etwas nicht versteht oder auf Russisch fragt, erkläre es kurz auf Russisch und bring das Gespräch zurück ins Deutsche. "
        "Halte deine Antworten kurz (1-2 Sätze), damit sie viel Gelegenheit zum Sprechen hat."
    )
}

# Доступные качественные голоса Gemini Live:
# Aoede - глубокий, тёплый женский
# Kore - нежный, спокойный женский
# Puck - бодрый, дружелюбный нейтральный
# Fenrir - спокойный мужской
DEFAULT_VOICES = {
    "coach": "Aoede",
    "german": "Aoede"
}

@router.websocket("/live")
async def gemini_live_websocket(client_ws: WebSocket):
    await client_ws.accept()
    print("🎧 [Coach Live] Новое голосовое подключение клиентского приложения")

    gemini_ws = None
    is_active = True

    # Voice Activity Detection (VAD) настройки
    SILENCE_THRESHOLD = 450       # Порог амплитуды голоса
    SILENCE_CHUNKS_TRIGGER = 6    # ~750мс тишины для закрытия реплики
    MIN_SPEECH_BYTES = 16000      # Мин. длина осмысленной фразы (0.5 сек)

    speech_buffer = bytearray()
    is_speaking = False
    silence_chunks = 0

    mode = "coach"
    voice_name = "Aoede"

    async def forward_from_gemini():
        """Пересылка аудио (24kHz PCM) и транскрипции от Gemini клиенту"""
        nonlocal is_active
        try:
            while is_active and gemini_ws:
                msg_raw = await gemini_ws.recv()
                resp = json.loads(msg_raw)

                server_content = resp.get("serverContent", {})

                # Обработка перебивания (Barge-in)
                if server_content.get("interrupted"):
                    await client_ws.send_json({"type": "interrupted"})
                    continue

                model_turn = server_content.get("modelTurn", {})
                parts = model_turn.get("parts", [])

                for part in parts:
                    # Аудиопоток от модели (PCM 24kHz)
                    if "inlineData" in part:
                        audio_b64 = part["inlineData"].get("data", "")
                        await client_ws.send_json({
                            "type": "audio",
                            "data": audio_b64
                        })

                    # Живая текстовая транскрипция ответа
                    if "text" in part:
                        text_chunk = part.get("text", "")
                        if text_chunk:
                            await client_ws.send_json({
                                "type": "transcript",
                                "role": "model",
                                "text": text_chunk
                            })

                if server_content.get("turnComplete"):
                    await client_ws.send_json({"type": "turn_complete"})

        except Exception as e:
            print("🎧 [Coach Live] Gemini stream ended:", e)
        finally:
            is_active = False

    try:
        while True:
            client_msg = await client_ws.receive_text()
            data = json.loads(client_msg)
            msg_type = data.get("type")

            # 1. Инициализация сессии Gemini Live
            if msg_type == "start":
                mode = data.get("mode", "coach")
                voice_name = data.get("voice", DEFAULT_VOICES.get(mode, "Aoede"))

                keys = get_gemini_api_keys()
                gemini_ws = None
                for idx, key in enumerate(keys):
                    ws_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={key}"
                    try:
                        print(f"🎧 [Coach Live] Подключение к Gemini Live (Ключ #{idx+1})...")
                        gemini_ws = await websockets.connect(ws_url)
                        break
                    except Exception as err:
                        print(f"🎧 [Coach Live] Ошибка ключа #{idx+1}: {err}")

                if not gemini_ws:
                    await client_ws.send_json({"type": "error", "message": "Не удалось подключиться к Gemini API"})
                    break

                # Отправка первичного Setup Payload с системными инструкциями
                system_instruction = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["coach"])
                setup_payload = {
                    "setup": {
                        "model": GEMINI_LIVE_MODEL,
                        "generationConfig": {
                            "responseModalities": ["AUDIO"],
                            "speechConfig": {
                                "voiceConfig": {
                                    "prebuiltVoiceConfig": {
                                        "voiceName": voice_name
                                    }
                                }
                            }
                        },
                        "systemInstruction": {
                            "parts": [{"text": system_instruction}]
                        }
                    }
                }
                await gemini_ws.send(json.dumps(setup_payload))
                setup_ack = await gemini_ws.recv()
                print("🎧 [Coach Live] Gemini Setup ACK received!")

                await client_ws.send_json({
                    "type": "ready",
                    "mode": mode,
                    "voice": voice_name
                })

                # Запускаем фоновую вычитку ответа от Gemini
                asyncio.create_task(forward_from_gemini())

            # 2. Потоковое аудио с микрофона (16kHz PCM chunks)
            elif msg_type == "audio" and gemini_ws:
                pcm_b64 = data.get("data")
                if pcm_b64:
                    raw = base64.b64decode(pcm_b64)
                    samples = struct.unpack(f"{len(raw)//2}h", raw) if len(raw) >= 2 else []
                    max_amp = max(abs(s) for s in samples) if samples else 0

                    # Голосовая активность (VAD)
                    if max_amp > SILENCE_THRESHOLD:
                        if not is_speaking:
                            is_speaking = True
                        silence_chunks = 0
                        speech_buffer.extend(raw)

                    elif is_speaking:
                        speech_buffer.extend(raw)
                        silence_chunks += 1

                        # Обнаружена пауза в речи (~750мс тишины) ➔ отправляем реплику целиком!
                        if silence_chunks >= SILENCE_CHUNKS_TRIGGER:
                            is_speaking = False
                            silence_chunks = 0
                            if len(speech_buffer) >= MIN_SPEECH_BYTES:
                                b64_turn = base64.b64encode(speech_buffer).decode("utf-8")
                                turn_msg = {
                                    "clientContent": {
                                        "turns": [
                                            {
                                                "role": "user",
                                                "parts": [
                                                    {
                                                        "inlineData": {
                                                            "mimeType": "audio/pcm;rate=16000",
                                                            "data": b64_turn
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        "turnComplete": True
                                    }
                                }
                                await gemini_ws.send(json.dumps(turn_msg))
                            speech_buffer.clear()

            # 3. Текстовое сообщение (если пользователь хочет написать вслух)
            elif msg_type == "text" and gemini_ws:
                user_text = data.get("text", "").strip()
                if user_text:
                    turn_msg = {
                        "clientContent": {
                            "turns": [
                                {
                                    "role": "user",
                                    "parts": [{"text": user_text}]
                                }
                            ],
                            "turnComplete": True
                        }
                    }
                    await gemini_ws.send(json.dumps(turn_msg))

    except WebSocketDisconnect:
        print("🎧 [Coach Live] Клиент отключился")
    except Exception as e:
        print("🎧 [Coach Live] Ошибка сокета:", e)
    finally:
        is_active = False
        if gemini_ws:
            try:
                await gemini_ws.close()
            except Exception:
                pass
