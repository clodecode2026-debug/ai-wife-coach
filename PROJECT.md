# Паспорт проекта: default

**Цель:** Совершенствование ai-wife-coach с Supabase, Gemini 2.5, мультичатами, досье и голосом

**Статус:** Реализация технического плана и интеграция всех модулей
**Обновлено:** 2026-10-06 18:02:34 UTC

## Стек технологий
`FastAPI`, `Gemini/LLM`, `Supabase`, `Storj S3`, `Tailwind CSS`, `Python`, `pytest`, `Gemini API`, `Gemini 2.5 Flash/Pro`

## Ключевые файлы и модули
- **`main.py`**: API для мультичатов и досье
- **`models.py`**: схемы и базы данных
- **`static/`**: веб-интерфейс
- **`coach.py`**: каскад Gemini 2.5 + досье
- **`german.py`**: немецкий тренажер
- **`library.py`**: библиотека
- **`tasks.py`**: трекер задач
- **`test_coach.py`**: тесты
- **`index.html`**: Файл .html
- **`style.css`**: Файл .css
- **`app.js`**: Файл .js
- **`requirements.txt`**: Файл .txt
- **`render.yaml`**: Файл .yaml
- **`database.py`**: клиент Supabase
- **`static/index.html & app.js`**: сайдбар чатов, вкладка досье, голосовой ввод/вывод
- **`tasks_router.py`**: Файл .py

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
- Supabase для персистентного хранения данных
- мультичаты
- каскад моделей Gemini
- живой голос (Web Speech API + TTS)
- мобильный UI/UX
- Supabase для персистентности
- Gemini 2.5 Flash/Pro каскад
- Досье жены с авто-извлечением фактов
- Мультичаты
- Живой голос (SpeechRecognition + SpeechSynthesis)
