"""FastAPI application exposing a simple chat endpoint.

The app serves the existing static assets (index.html, app.js, styles.css, etc.) and
provides a `/chat` endpoint that can be wired to a local GGUF-backed model in the
future. For now, the inference handler is a lightweight echo-style placeholder to
keep the interface usable without extra dependencies.
"""
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Base directory containing the frontend assets
BASE_DIR = Path(__file__).parent.resolve()

app = FastAPI(title="Lambeck LLM Studio")

# Allow the frontend to call the API whether it's served locally or elsewhere
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class ModelHandler:
    """Simple model handler stub.

    This wrapper exists so we can later drop in a real GGUF-backed model loader
    without changing the FastAPI routing code.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path
        # A real implementation could initialize a llama.cpp model here.

    async def generate(self, prompt: str) -> str:
        if not prompt.strip():
            raise ValueError("Prompt cannot be empty.")

        # Placeholder: echo the prompt while acknowledging the handler
        return f"(placeholder) You said: {prompt}"


# Attempt to discover a GGUF model nearby for future use
KNOWN_MODEL_NAMES = (
    "test_model.gguf",
    "test_model_ablated.gguf",
    "test_model_ablated_ablated.gguf",
)


def find_model_path() -> Optional[Path]:
    for name in KNOWN_MODEL_NAMES:
        candidate = BASE_DIR / name
        if candidate.exists():
            return candidate
    return None


model_handler = ModelHandler(find_model_path())


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> JSONResponse:
    """Return a chat-style response for the provided message."""
    try:
        reply = await model_handler.generate(request.message)
    except ValueError as exc:  # Explicit validation error
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # Unexpected failures bubble up as 500s
        raise HTTPException(status_code=500, detail="Model inference failed") from exc

    return JSONResponse(content=ChatResponse(response=reply).model_dump())


@app.get("/")
async def serve_index() -> FileResponse:
    """Serve the main single-page app."""
    index_path = BASE_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_path)


# Mount static files (JS, CSS, etc.) so the frontend can load assets
app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")


if __name__ == "__main__":  # pragma: no cover - convenience entry point
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
