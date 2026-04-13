# Digital Dubai Authority - Voice & Chat Agent (MVP)

An agentic voice and chat assistant for Dubai government services, powered by Mistral AI.
Citizens can interact via text or voice to get help with government services like DubaiNow, UAE PASS, DubaiPay, and more.

## Features

- **Text Chat** -- Conversational AI powered by Mistral Large
- **Voice Input** -- Speech-to-text via Mistral Voxtral (browser microphone)
- **Voice Output** -- Text-to-speech via Mistral TTS (auto-plays responses)
- **Bilingual** -- English and Arabic support with RTL layout
- **Dubai Government Services** -- Knowledgeable about DubaiNow, UAE PASS, DubaiPay, Smart Supplier, Dubai Careers, Happiness Meter, and more

## Architecture

```
Browser (HTML/CSS/JS)
    |
    | HTTP (REST)
    |
FastAPI Backend (Python)
    |
    | HTTPS
    |
Mistral AI API
  - Chat: mistral-large-latest
  - STT:  voxtral-mini-latest
  - TTS:  mistral-tts-latest
```

## Quick Start

### Prerequisites

- Python 3.10+
- A Mistral AI API key ([get one here](https://console.mistral.ai))

### Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your API key
export MISTRAL_API_KEY="your-api-key-here"

# Run the server
python server.py
```

Open http://localhost:8000 in your browser.

### Usage

1. **Text mode**: Type a message and press Enter or click Send.
2. **Voice mode**: Click the microphone button, speak, then click again to stop. Your speech is transcribed and sent as a message.
3. **Listen**: Click the speaker icon on any assistant message to hear it read aloud via TTS.
4. **Language**: Toggle between English and Arabic using the language selector in the header.

## Project Structure

```
.
├── server.py              # FastAPI backend
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html         # Main UI
│   ├── style.css          # Digital Dubai themed styles
│   └── app.js             # Frontend logic (chat, voice, TTS)
└── README.md
```

## Digital Dubai Brand

The UI follows Digital Dubai Authority's visual identity:
- Primary teal: `#00BCD4`
- Dark navy: `#1A237E`
- Gold accent: `#C9A84C`
- Clean, modern government aesthetic with teal accent border

## Configuration

| Environment Variable | Default | Description |
|---|---|---|
| `MISTRAL_API_KEY` | (required) | Your Mistral AI API key |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `CHAT_MODEL` | `mistral-large-latest` | Chat model ID |
| `STT_MODEL` | `voxtral-mini-latest` | Speech-to-text model ID |
| `TTS_MODEL` | `mistral-tts-latest` | Text-to-speech model ID |

## Screenshots

The interface features:
- Navy blue header with teal accent border (Digital Dubai branding)
- Welcome screen with quick-action buttons for common queries
- Chat bubbles with navy (user) and light gray (assistant) styling
- Microphone button with recording pulse animation
- Per-message TTS playback and copy buttons
- AR/EN language toggle with full RTL support
