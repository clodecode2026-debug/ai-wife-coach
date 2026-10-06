# Паспорт проекта: ai-wife-coach

**Цель:** Добавление натурального женского голоса edge-tts (ru-RU-SvetlanaNeural) в проект ai-wife-coach

**Статус:** Готово к деплою на Render и синхронизации с GitHub
**Обновлено:** 2026-10-06 20:23:56 UTC

## Стек технологий
`FastAPI`, `Gemini/LLM`, `Supabase`, `Storj S3`, `Tailwind CSS`, `Python`, `pytest`, `edge-tts`

## Ключевые файлы и модули
- **`main.py`**: FastAPI приложение и роуты
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
- **`requirements.txt`**: добавлены edge-tts и supabase.
- **`render.yaml`**: Файл .yaml
- **`keep_alive.py`**: Файл .py
- **`voice.py`**: edge-tts модуль
- **`static/app.js`**: фронтенд интеграция TTS

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
