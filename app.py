from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI(title="Lambeck AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")


class ChatRequest(BaseModel):
    message: str


class ModelRequest(BaseModel):
    model: str


class ModelSwapRequest(BaseModel):
    source_model: str
    target_model: str


class AblationRequest(BaseModel):
    model: Optional[str] = None
    level: int = 0
    content_filter: bool = False
    ethical_constraints: bool = False
    refusal_training: bool = False
    method: str = "layer-removal"


class ComparisonRequest(BaseModel):
    models: List[str]
    metrics: List[str]
    prompt: Optional[str] = None


class BranchRequest(BaseModel):
    conversation_id: str
    branch_name: Optional[str] = None


class PromptToolRequest(BaseModel):
    tool: str
    prompt: str


document_state = {
    "current_model": "test_model.gguf",
    "ablated": False,
    "branches": [],
    "memory": [
        {"id": 1, "type": "system", "content": "Session initialized"},
        {"id": 2, "type": "user", "content": "Welcome message acknowledged"},
    ],
}


@app.get("/")
async def root() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.post("/chat")
async def chat(request: ChatRequest):
    prompt = request.message.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    response = f"Echo: {prompt}"
    return {"response": response}


@app.post("/api/models/load")
async def load_model(request: ModelRequest):
    document_state["current_model"] = request.model
    document_state["ablated"] = False
    return {
        "model": request.model,
        "status": "loaded",
        "message": f"Model {request.model} loaded successfully",
    }


@app.post("/api/models/swap")
async def swap_model(request: ModelSwapRequest):
    previous_model = document_state.get("current_model", "")
    document_state["current_model"] = request.target_model
    document_state["ablated"] = False
    return {
        "previous_model": previous_model,
        "model": request.target_model,
        "status": "swapped",
        "message": f"Swapped {previous_model or request.source_model} for {request.target_model}",
    }


@app.post("/api/models/ablate")
async def ablate_model(request: AblationRequest):
    model_name = request.model or document_state.get("current_model", "unknown")
    document_state["current_model"] = model_name
    document_state["ablated"] = True
    disabled_filters = [
        name
        for name, enabled in (
            ("content_filter", request.content_filter),
            ("ethical_constraints", request.ethical_constraints),
            ("refusal_training", request.refusal_training),
        )
        if enabled
    ]

    return {
        "model": model_name,
        "status": "ablated",
        "level": request.level,
        "method": request.method,
        "disabled_filters": disabled_filters,
    }


@app.post("/api/models/compare")
async def compare_models(request: ComparisonRequest):
    if len(request.models) < 2:
        raise HTTPException(status_code=400, detail="At least two models are required for comparison")

    results = []
    for idx, model in enumerate(request.models, start=1):
        results.append(
            {
                "model": model,
                "metrics": {
                    metric: f"{80 + idx * 2 + len(metric)}"
                    for metric in request.metrics
                },
                "notes": f"Compared with prompt: {request.prompt or 'default prompt'}",
            }
        )
    return {"results": results, "status": "completed"}


@app.post("/api/conversations/branch")
async def branch_conversation(request: BranchRequest):
    branch_id = f"branch-{len(document_state['branches']) + 1}"
    branch = {
        "id": branch_id,
        "from": request.conversation_id,
        "name": request.branch_name or f"Branch {len(document_state['branches']) + 1}",
    }
    document_state["branches"].append(branch)
    return {"branch": branch, "status": "created"}


@app.get("/api/conversations/state")
async def conversation_state(conversation_id: str = "active"):
    return {
        "conversation_id": conversation_id,
        "memory": document_state["memory"],
        "branches": document_state["branches"],
        "model": document_state.get("current_model"),
        "ablated": document_state.get("ablated", False),
    }


@app.post("/api/prompts/tools")
async def prompt_tools(request: PromptToolRequest):
    tools = {
        "templates": [
            "You are a concise assistant.",
            "Answer using step-by-step reasoning.",
            "Adopt a friendly, upbeat tone.",
        ],
        "personalities": ["Stoic analyst", "Energetic mentor", "Calm explainer"],
        "optimizations": [
            "Shorten filler text",
            "Highlight critical steps",
            "Use bullet lists when summarizing",
        ],
    }

    return {
        "tool": request.tool,
        "prompt": request.prompt,
        "suggestions": tools.get(request.tool, []),
        "status": "ready",
    }


@app.get("/api/analytics")
async def analytics():
    return {
        "uptime": "24h",
        "requests": 1245,
        "avg_response_time_ms": 820,
        "token_rate": 42,
        "memory_usage_gb": 2.3,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
