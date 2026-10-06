from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import os

from coach import CoachService
from german import GermanTrainer
from library import LibraryService
from tasks import TaskTracker
from voice import router as voice_router

app = FastAPI(
    title="AI Wife Coach",
    description="Персональный бережный коуч-психолог, тренажер немецкого, библиотека и трекер заботы",
    version="1.0.0"
)

# Инициализация сервисов
coach_service = CoachService()
german_trainer = GermanTrainer()
library_service = LibraryService()
task_tracker = TaskTracker()

# Pydantic модели для запросов
class ChatRequest(BaseModel):
    message: str

class GermanCheckRequest(BaseModel):
    level: str
    german_text: str
    user_translation: str

class TaskCreateRequest(BaseModel):
    title: str
    category: str = "Забота"

class BookCreateRequest(BaseModel):
    title: str
    author: str
    category: str
    excerpt: str

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "ai-wife-coach"}

# Подключаем голосовой модуль
app.include_router(voice_router)

@app.post("/api/chat")
def chat_with_coach(req: ChatRequest):
    return coach_service.get_empathetic_response(req.message)

@app.get("/api/german/card")
def get_german_card(level: str = "A1"):
    return german_trainer.get_card(level)

@app.post("/api/german/check")
def check_german(req: GermanCheckRequest):
    return german_trainer.check_translation(req.level, req.german_text, req.user_translation)

@app.get("/api/books")
def get_books(q: str = None):
    if q:
        return library_service.search_quotes(q)
    return library_service.list_books()

@app.post("/api/books")
def add_book(req: BookCreateRequest):
    return library_service.add_custom_excerpt(req.title, req.author, req.category, req.excerpt)

@app.get("/api/tasks")
def get_tasks():
    return task_tracker.get_tasks()

@app.post("/api/tasks")
def add_task(req: TaskCreateRequest):
    return task_tracker.add_task(req.title, req.category)

@app.post("/api/tasks/{task_id}/toggle")
def toggle_task(task_id: int):
    result = task_tracker.toggle_task(task_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    result = task_tracker.delete_task(task_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

# Подключаем статику фронтенда, если есть папка static
os.makedirs("static", exist_ok=True)
if os.path.exists("static/index.html"):
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
else:
    @app.get("/", response_class=HTMLResponse)
    def root_ui():
        return """
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <title>AI Wife Coach 🌸</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-rose-50 text-slate-800 min-h-screen flex flex-col items-center justify-center p-6">
            <div class="max-w-xl w-full bg-white shadow-xl rounded-2xl p-8 border border-rose-100 text-center">
                <h1 class="text-3xl font-bold text-rose-600 mb-2">AI Wife Coach 🌸</h1>
                <p class="text-slate-600 mb-6">Твой персональный бережный коуч, немецкий тренажер и пространство заботы.</p>
                <div class="space-y-3 text-left bg-rose-50 p-4 rounded-xl text-sm text-rose-900 mb-6">
                    <p>✨ <b>/api/chat</b> — эмпатичный чат с психологом</p>
                    <p>✨ <b>/api/german/card</b> — карточки немецкого языка</p>
                    <p>✨ <b>/api/books</b> — библиотека психологических книг и цитат</p>
                    <p>✨ <b>/api/tasks</b> — трекер заботы и привычек</p>
                </div>
                <a href="/docs" class="inline-block bg-rose-500 hover:bg-rose-600 text-white font-medium px-6 py-3 rounded-xl transition shadow">Открыть Swagger API Документацию</a>
            </div>
        </body>
        </html>
        """
