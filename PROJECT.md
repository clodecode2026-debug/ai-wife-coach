# Паспорт проекта: ai-wife-coach

**Цель:** Интеграция натурального женского голоса через edge-tts в проект ai-wife-coach

**Статус:** Готово к деплою на Render и синхронизации с GitHub
**Обновлено:** 2026-10-06 20:41:18 UTC

## Стек технологий
`FastAPI`, `Gemini/LLM`, `Supabase`, `Storj S3`, `Tailwind CSS`, `Python`, `pytest`, `edge-tts`

## Ключевые файлы и модули
- **`main.py`**: подключение voice_router
- **`models.py`**: схемы и базы данных
- **`static/`**: веб-интерфейс
- **`coach.py`**: коучинг
- **`german.py`**: немецкий
- **`library.py`**: книги
- **`tasks.py`**: задачи
- **`test_coach.py`**: тесты
- **`index.html`**: Файл .html
- **`style.css`**: Файл .css
- **`app.js`**: Файл .js
- **`requirements.txt`**: добавление edge-tts>=6.1.12
- **`render.yaml`**: Файл .yaml
- **`keep_alive.py`**: Файл .py
- **`voice.py`**: эндпоинт /api/voice/tts с edge-tts
- **`static/app.js`**: воспроизведение аудио через /api/voice/tts

## Принятые решения
- AI коуч-психолог с мягкой поддержкой
- интеграция LLM
- модуль изучения немецкого
- библиотека книг
- трекер задач
- уютный адаптивный веб-интерфейс
- Эмпатичный ИИ-коуч с мягкой валидацией
- модуль немецкого A1-B2
- трекер заботы
- FastAPI
- Tailwind CSS
- Интеграция edge-tts для озвучивания ответов коуча (ru-RU-SvetlanaNeural)
- добавлены эндпоинты /api/voice/tts и фронтенд-кнопки озвучки в реальном времени.
- Добавлен модуль голосового синтеза edge-tts (/api/voice/tts) с русской озвучкой SvetlanaNeural
- интерфейс чата обогащен кнопками озвучивания и голосовым вводом.
- Добавлен FastAPI эндпоинт /api/voice/tts через edge-tts с голосом ru-RU-SvetlanaNeural
- фронтенд воспроизводит аудиоответы через этот эндпоинт с бэкапом в Web Speech API
- зависимости edge-tts>=6.1.12 прописаны в requirements.txt
- интегрирован эндпоинт POST /api/voice/tts с edge-tts (ru-RU-SvetlanaNeural)
- фронтенд оздоравливает ответы коуча через потоковое воспроизведение audio/mpeg
- проведены тесты и валидация кода
- интеграция edge-tts через /api/voice/tts с голосом ru-RU-SvetlanaNeural
- обновление frontend app.js для воспроизведения аудио стриминга
- эндпоинт POST /api/voice/tts с потоковым audio/mpeg
- фронтенд app.js интегрирован с /api/voice/tts
- edge-tts интегрирован в FastAPI через /api/voice/tts с голосом ru-RU-SvetlanaNeural
- фронтенд app.js вызывает этот эндпоинт для натуральной озвучки ответов коуча
