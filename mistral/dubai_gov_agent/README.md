# Digital Dubai Authority - Voice & Chat Agent (MVP)

An agentic voice and chat assistant for Dubai government services, powered by
Mistral AI. Citizens can interact via text chat or voice to get help with visa,
residency, business licensing, housing, transport, health, and other government
services.

## Architecture

```
Browser (React + Vite)
  |
  |-- Chat Mode  -->  Mistral Chat API  (mistral-medium-latest)
  |-- Voice Mode -->  STT (mistral-small-latest)
  |                     --> Chat (mistral-medium-latest)
  |                     --> TTS (voxtral-mini-tts-2603)
  |-- Listen btn -->  Mistral TTS API
  |
  All API calls go directly from browser to api.mistral.ai
  (API key stored in browser localStorage)
```

## Features

- **Text Chat** -- Conversational agent with Dubai government services knowledge
- **Voice Mode** -- Push-to-talk voice interaction with STT -> Chat -> TTS pipeline
- **Listen Button** -- Click "Listen" on any assistant response to hear it spoken
- **Service Categories** -- Quick-action cards for 6 service areas with pre-built queries
- **Bilingual** -- Supports English and Arabic
- **No Backend** -- Runs entirely in the browser, calls Mistral API directly

## Services Covered

| Category | Examples |
|---|---|
| Visa & Residency | Golden visa, tourist visa, Emirates ID |
| Business & Licensing | Trade license, business registration |
| Housing & Property | Ejari, DEWA, property registration |
| Transport & Driving | Driving license, RTA, Salik, NOL |
| Health & Education | DHA services, KHDA, health insurance |
| General Government | Dubai Police, courts, DubaiNow app |

## Setup (MacBook Air M4)

### 1. Prerequisites

- Node.js 18+ (install via `brew install node`)
- A [Mistral AI API key](https://console.mistral.ai)

### 2. Install & Run

```bash
cd mistral/dubai_gov_agent
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### 3. Configure API Key

Click **Settings** in the top-right corner and enter your Mistral API key.
The key is stored in your browser's localStorage.

### 4. Voice Mode

Click the **Voice** toggle in the header. Tap the circle to start speaking,
tap again to stop. The agent will transcribe your speech, generate a response,
and speak it back to you.

## Models Used

| Purpose | Model ID |
|---|---|
| Chat | `mistral-medium-latest` |
| Speech-to-Text | `mistral-small-latest` |
| Text-to-Speech | `voxtral-mini-tts-2603` |

## Project Structure

```
mistral/dubai_gov_agent/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── Header.tsx
    │   ├── ChatPanel.tsx
    │   ├── VoicePanel.tsx
    │   └── SettingsModal.tsx
    ├── hooks/
    │   └── useAudioRecorder.ts
    ├── services/
    │   ├── mistralApi.ts
    │   └── dubaiServices.ts
    ├── styles/
    │   └── global.css
    └── types/
        └── index.ts
```

## Notes

- This is an **MVP for local testing**. Not production-ready.
- No backend server needed -- all Mistral API calls happen client-side.
- The frontend uses the browser's MediaRecorder API for voice capture (WebM/Opus).
- Conversation history is maintained in React state (lost on page refresh).
