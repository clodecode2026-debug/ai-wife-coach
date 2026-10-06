from fastapi import APIRouter

tasks_router = APIRouter()

@tasks_router.get("/status")
def tasks_status():
    return {"status": "ok", "module": "tasks"}
