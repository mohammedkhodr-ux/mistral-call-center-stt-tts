"""
Digital Dubai Authority - Agentic Voice & Chat Agent
FastAPI backend serving citizen frontend + admin configuration panel.
"""

import base64
import io
import json
import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from mistralai.client import Mistral

from config import AppConfig, load_config, save_config

app = FastAPI(title="DDA Voice Chat Agent", version="1.0.0")

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory conversation store (per-session)
conversations: dict[str, list[dict]] = {}


def get_client() -> Mistral:
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="MISTRAL_API_KEY environment variable not set")
    return Mistral(api_key=api_key)


# ─── Page Routes ───────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def citizen_page(request: Request):
    config = load_config()
    return templates.TemplateResponse(request, "citizen.html", {"config": config})


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    config = load_config()
    return templates.TemplateResponse(request, "admin.html", {"config": config})


# ─── Config API ────────────────────────────────────────────────────────────────

@app.get("/api/config")
async def get_config():
    config = load_config()
    return config.model_dump(exclude={"custom_voice_audio_b64"})


@app.post("/api/config")
async def update_config(request: Request):
    data = await request.json()
    current = load_config()
    updated = current.model_copy(update=data)
    save_config(updated)
    return {"status": "ok", "config": updated.model_dump(exclude={"custom_voice_audio_b64"})}


# ─── Chat API ──────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: Request):
    """Text chat endpoint."""
    data = await request.json()
    message = data.get("message", "").strip()
    session_id = data.get("session_id", str(uuid.uuid4()))

    if not message:
        raise HTTPException(status_code=400, detail="Empty message")

    config = load_config()
    client = get_client()

    # Build conversation history
    if session_id not in conversations:
        conversations[session_id] = []

    history = conversations[session_id]
    history.append({"role": "user", "content": message})

    messages = [{"role": "system", "content": config.system_prompt}] + history

    response = client.chat.complete(
        model=config.chat_model,
        messages=messages,
        temperature=config.temperature,
        top_p=config.top_p,
        max_tokens=config.max_tokens,
    )

    assistant_msg = response.choices[0].message.content
    history.append({"role": "assistant", "content": assistant_msg})

    # Keep last 50 turns
    if len(history) > 100:
        history[:] = history[-100:]

    return {
        "response": assistant_msg,
        "session_id": session_id,
        "model": config.chat_model,
    }


@app.post("/api/chat/clear")
async def clear_chat(request: Request):
    data = await request.json()
    session_id = data.get("session_id")
    if session_id and session_id in conversations:
        del conversations[session_id]
    return {"status": "ok"}


# ─── STT API ──────────────────────────────────────────────────────────────────

@app.post("/api/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """Transcribe uploaded audio using Mistral STT."""
    config = load_config()
    client = get_client()

    audio_bytes = await audio.read()

    response = client.audio.transcriptions.complete(
        model=config.stt_model,
        file={
            "content": io.BytesIO(audio_bytes),
            "file_name": audio.filename or "audio.wav",
        },
        diarize=config.stt_diarize,
    )

    text = response.text if hasattr(response, "text") else ""
    if not text and hasattr(response, "segments") and response.segments:
        text = " ".join(s.text for s in response.segments)

    return {"text": text, "model": config.stt_model}


# ─── TTS API ──────────────────────────────────────────────────────────────────

@app.post("/api/tts")
async def text_to_speech(request: Request):
    """Generate speech from text using Mistral TTS."""
    data = await request.json()
    text = data.get("text", "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    config = load_config()
    client = get_client()

    kwargs = {
        "model": config.tts_model,
        "input": text,
        "response_format": config.tts_response_format,
    }

    # Use custom voice (ref_audio) if available, otherwise use voice_id
    if config.custom_voice_audio_b64:
        kwargs["ref_audio"] = config.custom_voice_audio_b64
    else:
        kwargs["voice_id"] = config.voice_id

    response = client.audio.speech.complete(**kwargs)

    audio_b64 = response.audio_data
    audio_bytes = base64.b64decode(audio_b64)

    content_type_map = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "pcm": "audio/pcm",
        "flac": "audio/flac",
        "opus": "audio/opus",
    }

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=content_type_map.get(config.tts_response_format, "audio/wav"),
        headers={"Content-Disposition": f"inline; filename=speech.{config.tts_response_format}"},
    )


# ─── Voice Recording Upload ──────────────────────────────────────────────────

@app.post("/api/voice/upload")
async def upload_voice(audio: UploadFile = File(...)):
    """Upload a reference voice recording for TTS cloning."""
    audio_bytes = await audio.read()
    b64 = base64.b64encode(audio_bytes).decode("utf-8")

    config = load_config()
    config.custom_voice_audio_b64 = b64
    save_config(config)

    # Also save the file for playback
    filepath = UPLOAD_DIR / "custom_voice.wav"
    with open(filepath, "wb") as f:
        f.write(audio_bytes)

    return {"status": "ok", "size_bytes": len(audio_bytes)}


@app.delete("/api/voice/upload")
async def delete_custom_voice():
    """Remove custom voice recording."""
    config = load_config()
    config.custom_voice_audio_b64 = None
    save_config(config)

    filepath = UPLOAD_DIR / "custom_voice.wav"
    if filepath.exists():
        filepath.unlink()

    return {"status": "ok"}


# ─── Admin Test Endpoints ────────────────────────────────────────────────────

@app.post("/api/test/chat")
async def test_chat(request: Request):
    """Test chat with custom parameters (admin panel)."""
    data = await request.json()
    client = get_client()

    model = data.get("model", "mistral-small-latest")
    temperature = float(data.get("temperature", 0.3))
    top_p = float(data.get("top_p", 0.95))
    max_tokens = int(data.get("max_tokens", 1024))
    message = data.get("message", "Hello")
    system_prompt = data.get("system_prompt", "You are a helpful assistant.")

    response = client.chat.complete(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
        temperature=temperature,
        top_p=top_p,
        max_tokens=max_tokens,
    )

    return {
        "response": response.choices[0].message.content,
        "model": model,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        },
    }


@app.post("/api/test/tts")
async def test_tts(request: Request):
    """Test TTS with custom parameters (admin panel)."""
    data = await request.json()
    client = get_client()

    model = data.get("model", "voxtral-mini-tts-2603")
    text = data.get("text", "Hello, this is a test.")
    voice_id = data.get("voice_id", "gb_jane_neutral")
    response_format = data.get("response_format", "wav")
    ref_audio = data.get("ref_audio")

    kwargs = {
        "model": model,
        "input": text,
        "response_format": response_format,
    }
    if ref_audio:
        kwargs["ref_audio"] = ref_audio
    else:
        kwargs["voice_id"] = voice_id

    response = client.audio.speech.complete(**kwargs)

    audio_b64 = response.audio_data
    audio_bytes = base64.b64decode(audio_b64)

    content_type_map = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "pcm": "audio/pcm",
        "flac": "audio/flac",
        "opus": "audio/opus",
    }

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=content_type_map.get(response_format, "audio/wav"),
    )


@app.post("/api/test/stt")
async def test_stt(audio: UploadFile = File(...), model: str = Form("voxtral-mini-latest"), diarize: bool = Form(False)):
    """Test STT with custom parameters (admin panel)."""
    client = get_client()
    audio_bytes = await audio.read()

    response = client.audio.transcriptions.complete(
        model=model,
        file={
            "content": io.BytesIO(audio_bytes),
            "file_name": audio.filename or "audio.wav",
        },
        diarize=diarize,
    )

    text = response.text if hasattr(response, "text") else ""
    segments = []
    if hasattr(response, "segments") and response.segments:
        if not text:
            text = " ".join(s.text for s in response.segments)
        segments = [
            {"start": s.start, "end": s.end, "text": s.text, "speaker_id": getattr(s, "speaker_id", None)}
            for s in response.segments
        ]

    return {"text": text, "segments": segments, "model": model}


@app.get("/api/models")
async def list_models():
    """List available Mistral models."""
    client = get_client()
    models = client.models.list()
    model_list = [{"id": m.id, "owned_by": getattr(m, "owned_by", "")} for m in models.data]
    return {"models": model_list}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
