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
import collections
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

try:
    from database import db_manager
except Exception:
    db_manager = None

router = APIRouter(prefix="/api/voice", tags=["Gemini Live Voice"])

GEMINI_LIVE_MODEL = "models/gemini-3.8-live"

# Дефолтные задержки тишины (VAD) перед ответом коуча:
# - Коуч/психолог: 1.5 секунды (естественная терапевтическая пауза)
# - Немецкий репетитор: 3.5 секунды (достаточно времени подумать и подобрать слова A1-B2)
DEFAULT_SILENCE_WAIT = {
    "coach": 1.5,
    "german": 3.5
}

GERMAN_SLOW_PROMPT_ADDITION = (
    " SPRECHTEMPO & ARTIKULATION: Sprich in einem DEUTLICH VERLANGSAMTEN, ruhigen und besonders klaren Tempo (ca. 0.8x Tempo). "
    "Artikuliere jedes deutsche Wort und jede Silbe sehr deutlich. "
    "Mache spürbare, entspannte Pausen zwischen den Wörtern und Sätzen, "
    "damit Alina jedes Wort mühelos heraushören, verstehen und mitsprechen kann."
)

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
        "Ты — заботливый, мудрый и тёплый личный AI-коуч и психолог для девушки по имени Алина и её мужа Романа. "
        "Твой стиль общения: живой, поддерживающий, чуткий, мягкий, без канцеляризмов и длинных лекций. "
        "Ты общаешься ГОЛОСОМ в реальном времени на русском языке. "
        "Если собеседник задаёт прямой вопрос или проверяет связь (например: 'Ты меня слышишь?', 'Сколько будет 2+2?', 'Как дела?'), "
        "всегда отвечай на вопрос прямо, мгновенно и дружелюбно, подтверждая, что слышишь каждое слово чётко и ясно! "
        "В терапевтическом диалоге внимательно слушай, помогай структурировать мысли, "
        "экологично справляться со стрессом, повышать самооценку и находить внутренние ресурсы. "
        "Отвечай кратко, емко (1-3 живых предложения), оставляя пространство для ответа."
    ),
    "german": (
        "Du bist ein geduldiger, freundlicher und motivierender Deutschlehrer und Gesprächspartner für Alina. "
        "Dein Ziel ist es, ihr zu helfen, Deutsch im Alltag fließend und ohne Angst zu sprechen (Niveau A1-B2). "
        "Sprich lebendig, langsam, klar und mit einfacher Alltagssprache auf Deutsch. "
        "Wenn der Nutzer spricht oder Testfragen stellt ('Hörst du mich?', 'Wie geht es dir?'), antworte sofort klar und direkt. "
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
# Charon - мудрый, бархатный мужской
SUPPORTED_VOICES = ["Aoede", "Kore", "Puck", "Fenrir", "Charon"]

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
    SILENCE_THRESHOLD = 300       # Чувствительный порог амплитуды (не срезает тихие звуки и согласные)
    MIN_SPEECH_BYTES = 12800      # Мин. длина осмысленной фразы (0.4 сек = 6400 сэмплов)

    mode = "coach"
    voice_name = "Aoede"
    slow_mode = False

    # Тайминг тишины перед ответом: 1.5с для коуча, 3.5с для немецкого
    silence_wait_sec = DEFAULT_SILENCE_WAIT["coach"]
    silence_chunks_trigger = max(5, int(silence_wait_sec / 0.128))

    speech_buffer = bytearray()
    pre_roll_chunks = collections.deque(maxlen=4)  # Буфер ~500мс для сохранения начала первого слова
    is_speaking = False
    consecutive_speech_chunks = 0
    silence_chunks = 0
    is_model_speaking = False

    async def forward_from_gemini():
        """Пересылка аудио (24kHz PCM) и транскрипции от Gemini клиенту"""
        nonlocal is_active, is_model_speaking
        try:
            while is_active and gemini_ws:
                msg_raw = await gemini_ws.recv()
                resp = json.loads(msg_raw)

                server_content = resp.get("serverContent", {})

                # Обработка перебивания (Barge-in)
                if server_content.get("interrupted"):
                    is_model_speaking = False
                    await client_ws.send_json({"type": "interrupted"})
                    continue

                model_turn = server_content.get("modelTurn", {})
                parts = model_turn.get("parts", [])

                for part in parts:
                    # Аудиопоток от модели (PCM 24kHz)
                    if "inlineData" in part:
                        is_model_speaking = True
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

                # Живая текстовая транскрипция Gemini Live (outputTranscription)
                out_trans = server_content.get("outputTranscription", {})
                if out_trans and "text" in out_trans:
                    trans_text = out_trans.get("text", "")
                    if trans_text:
                        await client_ws.send_json({
                            "type": "transcript",
                            "role": "model",
                            "text": trans_text
                        })

                if server_content.get("turnComplete"):
                    await client_ws.send_json({"type": "turn_complete"})
                    async def reset_speaking():
                        nonlocal is_model_speaking
                        await asyncio.sleep(0.35)
                        is_model_speaking = False
                    asyncio.create_task(reset_speaking())

        except websockets.exceptions.ConnectionClosed as cce:
            print(f"🎧 [Coach Live] Gemini WebSocket закрылся: code={cce.code}, reason='{cce.reason}'")
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
                requested_voice = data.get("voice", "").strip()
                voice_name = requested_voice if requested_voice in SUPPORTED_VOICES else DEFAULT_VOICES.get(mode, "Aoede")
                slow_mode = bool(data.get("slow_mode", False))

                # Настройка паузы ожидания тишины: 1.5с (коуч) или 3.5с (немецкий)
                custom_silence = data.get("silence_wait_sec")
                if custom_silence is not None:
                    silence_wait_sec = float(custom_silence)
                else:
                    silence_wait_sec = DEFAULT_SILENCE_WAIT.get(mode, 1.5)
                silence_chunks_trigger = max(5, int(silence_wait_sec / 0.128))

                keys = get_gemini_api_keys()
                gemini_ws = None
                for idx, key in enumerate(keys):
                    ws_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={key}"
                    try:
                        print(f"🎧 [Coach Live] Подключение к Gemini Live (Ключ #{idx+1}, режим: {mode}, тишина: {silence_wait_sec}с, slow: {slow_mode})...")
                        gemini_ws = await websockets.connect(ws_url)
                        break
                    except Exception as err:
                        print(f"🎧 [Coach Live] Ошибка ключа #{idx+1}: {err}")

                if not gemini_ws:
                    await client_ws.send_json({"type": "error", "message": "Не удалось подключиться к Gemini API"})
                    break

                # Отправка первичного Setup Payload с системными инструкциями
                custom_prompt = data.get("custom_prompt")
                if custom_prompt:
                    system_instruction = custom_prompt
                else:
                    dossier_ctx = ""
                    if mode == "coach" and db_manager:
                        try:
                            dossier = db_manager.get_dossier()
                            name = dossier.get("name", "Алина")
                            husband = dossier.get("husband", "Роман")
                            notes = dossier.get("notes", "")
                            dossier_ctx = f" Контекст клиентки: Имя: {name}. Муж: {husband}. Особенности: {notes}."
                        except Exception as de:
                            print(f"🎧 [Coach Live] Dossier load note: {de}")
                    system_instruction = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["coach"]) + dossier_ctx

                # Если немецкий режим — внедряем замедленный темп речи при запросе
                if mode == "german":
                    if slow_mode:
                        system_instruction += GERMAN_SLOW_PROMPT_ADDITION
                    else:
                        system_instruction += " Sprich in moderatem, klar artikuliertem Alltagstempo mit deutlichen Satzpausen."

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
                    "voice": voice_name,
                    "silence_wait_sec": silence_wait_sec,
                    "slow_mode": slow_mode
                })

                # Запускаем фоновую вычитку ответа от Gemini
                asyncio.create_task(forward_from_gemini())

            # 2. Обновление параметров активной сессии (динамическое переключение темпа или паузы)
            elif msg_type == "update_config":
                if "silence_wait_sec" in data:
                    silence_wait_sec = float(data["silence_wait_sec"])
                    silence_chunks_trigger = max(5, int(silence_wait_sec / 0.128))
                    print(f"🎧 [Coach Live] Обновлен тайминг тишины: {silence_wait_sec}с ({silence_chunks_trigger} чанков)")
                if "slow_mode" in data:
                    slow_mode = bool(data["slow_mode"])
                    print(f"🎧 [Coach Live] Обновлен slow_mode: {slow_mode}")
                await client_ws.send_json({
                    "type": "config_updated",
                    "silence_wait_sec": silence_wait_sec,
                    "slow_mode": slow_mode
                })

            # 3. Ручное подтверждение реплики (кнопка 'Отправить' / 'Сказать сейчас')
            elif msg_type == "commit_speech" and gemini_ws:
                if is_speaking and len(speech_buffer) >= MIN_SPEECH_BYTES:
                    is_speaking = False
                    consecutive_speech_chunks = 0
                    chunk_bytes = 4096
                    excess_silence_chunks = max(0, silence_chunks - 2)
                    excess_bytes = excess_silence_chunks * chunk_bytes
                    silence_chunks = 0
                    if excess_bytes > 0 and len(speech_buffer) > excess_bytes + MIN_SPEECH_BYTES:
                        audio_to_send = bytes(speech_buffer[:-excess_bytes])
                    else:
                        audio_to_send = bytes(speech_buffer)
                    b64_turn = base64.b64encode(audio_to_send).decode("utf-8")
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

            # 4. Потоковое аудио с микрофона (16kHz PCM chunks)
            elif msg_type == "audio" and gemini_ws:
                pcm_b64 = data.get("data")
                if pcm_b64:
                    raw = base64.b64decode(pcm_b64)
                    samples = struct.unpack(f"{len(raw)//2}h", raw) if len(raw) >= 2 else []
                    max_amp = max(abs(s) for s in samples) if samples else 0

                    # Защита от акустического эха динамиков:
                    # Если коуч сейчас говорит из динамиков, не даем тихому эху перебивать коуча
                    if is_model_speaking and max_amp < 8500:
                        continue

                    # Голосовая активность (VAD)
                    if max_amp > SILENCE_THRESHOLD:
                        consecutive_speech_chunks += 1
                        if not is_speaking and consecutive_speech_chunks >= 2:
                            is_speaking = True
                            # Восстанавливаем ~500мс пред-буфера, чтобы не потерять начало фразы
                            for pre_chunk in pre_roll_chunks:
                                speech_buffer.extend(pre_chunk)
                            pre_roll_chunks.clear()

                        if is_speaking:
                            silence_chunks = 0
                            speech_buffer.extend(raw)

                    else:
                        consecutive_speech_chunks = 0
                        if is_speaking:
                            speech_buffer.extend(raw)
                            silence_chunks += 1

                            # Достигнут порог тишины (1.5с для коуча, 3.5с для немецкого) ➔ завершаем фразу!
                            if silence_chunks >= silence_chunks_trigger:
                                is_speaking = False
                                # Обрезаем избыточную хвостовую тишину ожидания:
                                # Оставляем ~250мс естественного затухания, а остальные секунды тишины отсекаем,
                                # чтобы Gemini не воспринимал долгое молчание как обрыв связи
                                chunk_bytes = len(raw) if raw else 4096
                                excess_silence_chunks = max(0, silence_chunks - 2)
                                excess_bytes = excess_silence_chunks * chunk_bytes
                                silence_chunks = 0
                                if len(speech_buffer) >= MIN_SPEECH_BYTES:
                                    if excess_bytes > 0 and len(speech_buffer) > excess_bytes + MIN_SPEECH_BYTES:
                                        audio_to_send = bytes(speech_buffer[:-excess_bytes])
                                    else:
                                        audio_to_send = bytes(speech_buffer)
                                    b64_turn = base64.b64encode(audio_to_send).decode("utf-8")
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
                                    print(f"🎧 [Coach Live] Отправка turn_msg в Gemini: {len(audio_to_send)} байт PCM...")
                                    try:
                                        await gemini_ws.send(json.dumps(turn_msg))
                                        print(f"🎧 [Coach Live] Успешно отправлен turn_msg!")
                                    except Exception as se:
                                        print(f"❌ [Coach Live] Ошибка отправки turn_msg: {se}")
                                speech_buffer.clear()
                        else:
                            # Пока фраза не началась — накапливаем кольцевой пред-буфер
                            pre_roll_chunks.append(raw)

            # 5. Текстовое сообщение (если пользователь хочет написать вслух)
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
