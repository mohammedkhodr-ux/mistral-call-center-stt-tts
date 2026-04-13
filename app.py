"""
Digital Dubai Authority - Agentic Voice & Chat Assistant
Backend powered by Mistral AI (Chat, STT, TTS)
"""

import base64
import json
import os
import tempfile
from pathlib import Path

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Digital Dubai Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_BASE_URL = "https://api.mistral.ai/v1"
CHAT_MODEL = os.environ.get("CHAT_MODEL", "mistral-medium-latest")
STT_MODEL = os.environ.get("STT_MODEL", "mistral-stt-latest")
TTS_MODEL = os.environ.get("TTS_MODEL", "mistral-tts-latest")
TTS_VOICE = os.environ.get("TTS_VOICE", "")

SYSTEM_PROMPT = """You are the Digital Dubai Authority virtual assistant. You help citizens and residents of Dubai with government services, information, and guidance.

Your responsibilities:
- Guide users through Dubai government services (DubaiNow, UAE PASS, DubaiPay, Smart Supplier, Dubai Careers, etc.)
- Provide information about government initiatives (Paperless Strategy, Happiness Agenda, Blockchain Strategy, AI initiatives)
- Help with general inquiries about living, working, and doing business in Dubai
- Direct users to the appropriate government entity or service for their needs
- Support both English and Arabic speakers

Key services you can help with:
1. UAE PASS - Digital identity and authentication
2. DubaiNow - City services app (bill payments, visa services, traffic fines, etc.)
3. DubaiPay - Government payment gateway
4. Dubai Careers - Job opportunities in Dubai government
5. Smart Supplier - Supplier management for government procurement
6. Data.Dubai - Open data platform

Guidelines:
- Be professional, courteous, and helpful
- Provide accurate information about Dubai government services
- If you don't know something specific, direct users to the official website (digitaldubai.ae) or relevant government entity
- Keep responses concise but informative
- When discussing fees or legal matters, always recommend verifying with the official source
- Respect privacy and never ask for sensitive personal information like Emirates ID numbers or passwords
"""


def _headers():
    if not MISTRAL_API_KEY:
        raise HTTPException(status_code=500, detail="MISTRAL_API_KEY not set")
    return {"Authorization": f"Bearer {MISTRAL_API_KEY}"}


# ── Chat ────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatResponse(BaseModel):
    reply: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + req.messages
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/chat/completions",
            headers={**_headers(), "Content-Type": "application/json"},
            json={"model": CHAT_MODEL, "messages": messages},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    reply = data["choices"][0]["message"]["content"]
    return ChatResponse(reply=reply)


# ── Speech-to-Text ──────────────────────────────────────────────────────


@app.post("/api/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    mime_map = {".webm": "audio/webm", ".ogg": "audio/ogg", ".mp4": "audio/mp4",
                ".wav": "audio/wav", ".mp3": "audio/mpeg", ".flac": "audio/flac"}
    content_type = mime_map.get(suffix, "audio/webm")

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/audio/transcriptions",
            headers=_headers(),
            files={"file": (f"recording{suffix}", audio_bytes, content_type)},
            data={"model": STT_MODEL},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    return {"text": data.get("text", "")}


# ── Text-to-Speech ──────────────────────────────────────────────────────


class TTSRequest(BaseModel):
    text: str


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    body: dict = {"model": TTS_MODEL, "input": req.text}
    if TTS_VOICE:
        body["voice_id"] = TTS_VOICE

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/audio/speech",
            headers={**_headers(), "Content-Type": "application/json"},
            json=body,
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    data = resp.json()
    return {"audio": data.get("audio_data", "")}


# ── Static files & SPA fallback ─────────────────────────────────────────

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(static_dir / "index.html"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
