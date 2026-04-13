# Digital Dubai Authority - Voice & Chat Agent (MVP)

Agentic voice and chat assistant for Digital Dubai Authority, powered by Mistral AI. Citizens can interact with Dubai government services through text or voice.

## Architecture

```
Browser (HTML/JS)
  |
  |-- /api/chat  -->  Mistral Chat API (mistral-medium-latest)
  |-- /api/stt   -->  Mistral STT API  (mistral-stt-latest / voxtral-mini)
  |-- /api/tts   -->  Mistral TTS API  (mistral-tts-latest)
  |
FastAPI (Python)
```

## Features

- **Text Chat** - Conversational AI assistant for Dubai government services
- **Voice Input (STT)** - Click the microphone to speak; audio is transcribed via Mistral STT
- **Voice Output (TTS)** - Toggle the speaker button to hear responses read aloud via Mistral TTS
- **Quick Actions** - Pre-built prompts for common queries (UAE PASS, traffic fines, DubaiNow, business licenses)
- **Digital Dubai Branding** - Teal/gold color scheme matching the official Digital Dubai Authority identity

## Prerequisites

- Python 3.10+
- A [Mistral AI API key](https://console.mistral.ai/)
- macOS (tested on MacBook Air M4)

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set your API key
export MISTRAL_API_KEY="your-api-key-here"

# Run the server
python app.py
```

**Troubleshooting:** If you see import errors, make sure you are running
inside the virtual environment (`source .venv/bin/activate`). The app uses
`httpx` for direct HTTP calls to the Mistral API -- no SDK version conflicts.

Open [http://localhost:8000](http://localhost:8000) in your browser.

## Configuration

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `MISTRAL_API_KEY` | (required) | Your Mistral AI API key |
| `CHAT_MODEL` | `mistral-medium-latest` | Model for chat completions |
| `STT_MODEL` | `mistral-stt-latest` | Model for speech-to-text |
| `TTS_MODEL` | `mistral-tts-latest` | Model for text-to-speech |
| `TTS_VOICE` | (default voice) | Voice ID for TTS output |

## Usage

### Text Chat
Type your question in the input box and press Enter or click the send button.

### Voice Input
1. Click the microphone button (it turns red while recording)
2. Speak your question
3. Click the microphone again to stop recording
4. The audio is sent to Mistral STT, transcribed, and automatically submitted as a chat message

### Voice Output
1. Click the speaker button to enable TTS (it turns gold when active)
2. All subsequent assistant responses will be read aloud
3. Click again to disable

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves the frontend |
| `POST` | `/api/chat` | Chat completion (JSON body: `{messages: [...]}`) |
| `POST` | `/api/stt` | Speech-to-text (multipart form: `audio` file) |
| `POST` | `/api/tts` | Text-to-speech (JSON body: `{text: "..."}`) |

## Project Structure

```
.
├── app.py              # FastAPI backend
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── static/
    └── index.html      # Single-page frontend
```
