"""
Digital Dubai Authority - Agentic Voice & Chat Assistant
Backend powered by Mistral AI (Chat, STT, TTS)
"""

import base64
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from mistralai.client import Mistral
from pydantic import BaseModel

app = FastAPI(title="Digital Dubai Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "mistral-medium-latest")
STT_MODEL = os.environ.get("STT_MODEL", "mistral-stt-latest")
TTS_MODEL = os.environ.get("TTS_MODEL", "mistral-tts-latest")
TTS_VOICE = os.environ.get("TTS_VOICE", "")  # Leave empty to use default

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


def get_client() -> Mistral:
    if not MISTRAL_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="MISTRAL_API_KEY environment variable is not set",
        )
    return Mistral(api_key=MISTRAL_API_KEY)


# ── Chat ────────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    messages: list[dict]


class ChatResponse(BaseModel):
    reply: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    client = get_client()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + req.messages
    resp = client.chat.complete(model=CHAT_MODEL, messages=messages)
    reply = resp.choices[0].message.content
    return ChatResponse(reply=reply)


# ── Speech-to-Text ──────────────────────────────────────────────────────


@app.post("/api/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    client = get_client()
    audio_bytes = await audio.read()

    # Write to a temp file so we can pass it to the SDK
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            result = client.audio.transcriptions.complete(
                model=STT_MODEL,
                file={
                    "file_name": f"recording{suffix}",
                    "content": f,
                },
            )
        return {"text": result.text}
    finally:
        os.unlink(tmp_path)


# ── Text-to-Speech ──────────────────────────────────────────────────────


class TTSRequest(BaseModel):
    text: str


@app.post("/api/tts")
async def text_to_speech(req: TTSRequest):
    client = get_client()

    kwargs = {
        "model": TTS_MODEL,
        "input": req.text,
    }
    if TTS_VOICE:
        kwargs["voice_id"] = TTS_VOICE

    result = client.audio.speech.complete(**kwargs)
    audio_b64 = result.audio_data
    return {"audio": audio_b64}


# ── Static files & SPA fallback ─────────────────────────────────────────

static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(static_dir / "index.html"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
