# Digital Dubai Authority - Agentic Voice & Chat Agent

A pilot MVP for Digital Dubai Authority (DDA) that enables citizens to interact with Dubai government services through text chat and voice. Powered by Mistral AI models for chat, speech-to-text (STT), and text-to-speech (TTS).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser                           │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │  Citizen UI (/)   │  │  Admin Panel (/admin)   │  │
│  │  - Chat           │  │  - Model config         │  │
│  │  - Voice input    │  │  - TTS/STT settings     │  │
│  │  - TTS playback   │  │  - System prompts       │  │
│  │  - EN/AR toggle   │  │  - Voice recording      │  │
│  └────────┬─────────┘  │  - Test chat/TTS/STT    │  │
│           │             └──────────┬──────────────┘  │
└───────────┼────────────────────────┼─────────────────┘
            │                        │
            ▼                        ▼
┌─────────────────────────────────────────────────────┐
│              FastAPI Backend (:8000)                 │
│  /api/chat    /api/stt    /api/tts    /api/config   │
│  /api/test/*  /api/voice/upload  /api/models        │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Mistral AI API    │
              │  - Chat completion  │
              │  - Voxtral STT     │
              │  - Voxtral TTS     │
              └─────────────────────┘
```

## Features

### Citizen Frontend (`/`)
- Text chat with conversation history
- Voice input via microphone (STT)
- Listen to responses (TTS)
- Arabic/English language toggle
- Quick-access service chips (Visa, Business License, etc.)
- DDA-branded UI (navy, blue, green, gold)

### Admin Panel (`/admin`)
- **Model Settings**: Select chat model, temperature, top_p, max tokens
- **TTS Settings**: Model, voice ID, audio format
- **STT Settings**: Model, diarization toggle
- **System Prompts**: Editable English and Arabic prompts
- **Voice Recording**: Record or upload a reference voice for TTS cloning
- **Test Chat**: Test chat with custom parameters, view token usage
- **Test TTS**: Generate speech with custom voice/model/format
- **Test STT**: Record or upload audio for transcription testing

## Setup (MacBook Air M4)

### Prerequisites
- Python 3.11+
- Mistral AI API key

### Install

```bash
cd mistral/agents/dda_voice_chat
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Configure

```bash
export MISTRAL_API_KEY="your-api-key-here"
```

### Run

```bash
python app.py
```

Open in browser:
- **Citizen UI**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Citizen chat interface |
| GET | `/admin` | Admin configuration panel |
| GET | `/api/config` | Get current configuration |
| POST | `/api/config` | Update configuration |
| POST | `/api/chat` | Send chat message |
| POST | `/api/chat/clear` | Clear conversation history |
| POST | `/api/stt` | Transcribe audio file |
| POST | `/api/tts` | Generate speech from text |
| POST | `/api/voice/upload` | Upload reference voice |
| DELETE | `/api/voice/upload` | Remove custom voice |
| POST | `/api/test/chat` | Test chat with custom params |
| POST | `/api/test/tts` | Test TTS with custom params |
| POST | `/api/test/stt` | Test STT with custom params |
| GET | `/api/models` | List available Mistral models |

## Models Used

| Function | Model | Description |
|----------|-------|-------------|
| Chat | `mistral-small-latest` | Conversational AI (configurable) |
| STT | `voxtral-mini-latest` | Speech-to-text transcription |
| TTS | `voxtral-mini-tts-2603` | Text-to-speech synthesis |

## DDA Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| DDA Blue | `#00A4E4` | Primary actions, links |
| DDA Navy | `#003B5C` | Header, dark elements |
| DDA Green | `#6CC24A` | Success states |
| DDA Gold | `#C4A35A` | Accent |
| Background | `#F5F7FA` | Page background |
