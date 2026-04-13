"""
Digital Dubai Authority - Voice & Chat Agent Backend
FastAPI server proxying Mistral AI APIs (Chat, STT, TTS).
"""

import base64
import os
from typing import Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")
MISTRAL_BASE_URL = "https://api.mistral.ai/v1"
CHAT_MODEL = os.environ.get("CHAT_MODEL", "mistral-large-latest")
STT_MODEL = os.environ.get("STT_MODEL", "voxtral-mini-latest")
TTS_MODEL = os.environ.get("TTS_MODEL", "mistral-tts-latest")
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8000"))

SYSTEM_PROMPT_EN = """You are the Digital Dubai Authority virtual assistant. You help citizens and residents of Dubai with government services and information.

You are knowledgeable about the following Dubai government services and platforms:
- **DubaiNow**: The unified Dubai government services app offering 130+ smart services (bill payments, visa services, traffic fines, NOC requests, etc.)
- **UAE PASS**: The national digital identity for accessing government services securely
- **DubaiPay**: The government payment gateway for paying fees and fines
- **Dubai Careers**: Job opportunities in Dubai government entities
- **Smart Supplier**: Supplier registration and management for government procurement
- **Happiness Meter**: Customer satisfaction measurement across government services
- **Smart Employee**: HR services for Dubai government employees
- **Data.Dubai**: Dubai's open data platform

You can help with:
1. Explaining how to use these services
2. Guiding users through common procedures (visa renewal, fine payment, license applications)
3. Providing information about Dubai government initiatives (Paperless Strategy, Blockchain Strategy, AI Strategy)
4. Directing users to the right service or department
5. General information about Digital Dubai Authority

Guidelines:
- Be professional, helpful, and concise
- If you don't know something specific, direct the user to the official website (digitaldubai.ae) or DubaiNow app
- Support both English and Arabic queries
- For urgent matters, suggest contacting the relevant authority directly
- Never make up specific phone numbers, fees, or deadlines - direct users to official sources for current information
"""

SYSTEM_PROMPT_AR = """أنت المساعد الافتراضي لهيئة دبي الرقمية. تساعد المواطنين والمقيمين في دبي في الخدمات والمعلومات الحكومية.

لديك معرفة بالخدمات والمنصات الحكومية التالية في دبي:
- **دبي الآن (DubaiNow)**: تطبيق الخدمات الحكومية الموحد الذي يقدم أكثر من 130 خدمة ذكية
- **الهوية الرقمية (UAE PASS)**: الهوية الرقمية الوطنية للوصول إلى الخدمات الحكومية
- **دبي باي (DubaiPay)**: بوابة الدفع الحكومية
- **وظائف دبي (Dubai Careers)**: فرص العمل في الجهات الحكومية
- **المورد الذكي (Smart Supplier)**: تسجيل وإدارة الموردين
- **مقياس السعادة (Happiness Meter)**: قياس رضا المتعاملين
- **الموظف الذكي (Smart Employee)**: خدمات الموارد البشرية
- **بيانات دبي (Data.Dubai)**: منصة البيانات المفتوحة

إرشادات:
- كن محترفاً ومفيداً وموجزاً
- إذا لم تكن متأكداً من معلومة، وجّه المستخدم إلى الموقع الرسمي أو تطبيق دبي الآن
- لا تختلق أرقام هواتف أو رسوم أو مواعيد نهائية
"""

# In-memory conversation store (per-session, resets on restart)
conversations: dict[str, list[dict]] = {}

app = FastAPI(title="Digital Dubai Voice Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _headers() -> dict:
    if not MISTRAL_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="MISTRAL_API_KEY environment variable is not set",
        )
    return {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }


@app.post("/api/chat")
async def chat(
    message: str = Form(...),
    session_id: str = Form("default"),
    language: str = Form("en"),
):
    """Send a text message and get an AI response."""
    system_prompt = SYSTEM_PROMPT_AR if language == "ar" else SYSTEM_PROMPT_EN

    if session_id not in conversations:
        conversations[session_id] = []

    conversations[session_id].append({"role": "user", "content": message})

    messages = [{"role": "system", "content": system_prompt}] + conversations[
        session_id
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/chat/completions",
            headers=_headers(),
            json={
                "model": CHAT_MODEL,
                "messages": messages,
                "temperature": 0.4,
                "max_tokens": 1024,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    assistant_msg = data["choices"][0]["message"]["content"]
    conversations[session_id].append(
        {"role": "assistant", "content": assistant_msg}
    )

    # Keep conversation history manageable (last 20 turns)
    if len(conversations[session_id]) > 40:
        conversations[session_id] = conversations[session_id][-40:]

    return JSONResponse({"reply": assistant_msg})


@app.post("/api/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """Transcribe audio using Mistral Voxtral."""
    audio_bytes = await audio.read()
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    # Determine the data URI prefix based on content type
    content_type = audio.content_type or "audio/webm"
    data_uri = f"data:{content_type};base64,{audio_b64}"

    payload: dict = {
        "model": STT_MODEL,
        "file": data_uri,
    }
    if language:
        payload["language"] = language

    headers = _headers()

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/audio/transcriptions",
            headers=headers,
            json=payload,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    return JSONResponse({"text": data.get("text", "")})


@app.post("/api/tts")
async def text_to_speech(
    text: str = Form(...),
    voice_id: Optional[str] = Form(None),
):
    """Generate speech from text using Mistral TTS."""
    payload: dict = {
        "model": TTS_MODEL,
        "input": text,
    }
    if voice_id:
        payload["voice_id"] = voice_id

    headers = _headers()

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{MISTRAL_BASE_URL}/audio/speech",
            headers=headers,
            json=payload,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json()
    return JSONResponse({"audio_data": data.get("audio_data", "")})


@app.post("/api/reset")
async def reset_conversation(session_id: str = Form("default")):
    """Clear conversation history for a session."""
    conversations.pop(session_id, None)
    return JSONResponse({"status": "ok"})


# Serve static files and SPA fallback
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
