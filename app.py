from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Lambeck AI", version="0.1.0")

static_dir = BASE_DIR
app.mount("/static", StaticFiles(directory=static_dir), name="static")


class ChatRequest(BaseModel):
    message: str


router = APIRouter()


@router.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(BASE_DIR / "index.html")


@router.post("/chat")
async def chat_endpoint(payload: ChatRequest):
    user_message = payload.message.strip()
    if not user_message:
        return {"response": "Please provide a message to process."}

    return {"response": f"Echo: {user_message}"}


app.include_router(router)
