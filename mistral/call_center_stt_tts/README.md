# Mistral Call Center - STT & TTS Console

A front-end application for call center agents using **Mistral AI Speech-to-Text** and **Text-to-Speech** APIs. Built with React, TypeScript, and Vite.

## Features

| Feature | Description |
|---|---|
| **Speech-to-Text** | Record customer audio via microphone or upload audio files, transcribed using Mistral's `mistral-small-latest` model |
| **Text-to-Speech** | Type agent responses and generate speech audio using Mistral's TTS API |
| **Voice Selection** | Browse and select from available Mistral voices (preset and custom) |
| **Conversation Log** | Real-time conversation timeline with customer/agent messages and audio playback |
| **File Upload** | Upload WAV, MP3, WebM, FLAC, OGG files for batch transcription |
| **Speaker Diarization** | Optional speaker identification in transcriptions |
| **Multi-language** | Support for 14+ languages with auto-detection |
| **Customizable Theme** | Full theme editor with 10 configurable properties (colors, border radius, font) persisted to localStorage |

## Quick Start

```bash
# Clone and navigate
git clone https://github.com/mistralai/cookbook.git
cd cookbook/mistral/call_center_stt_tts

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000, then:

1. Click **Settings** (top right)
2. Enter your Mistral API key (get one at [console.mistral.ai](https://console.mistral.ai/api-keys/))
3. Start using STT/TTS

## Architecture

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Main layout (split-panel)
├── components/
│   ├── Header.tsx            # Top bar with status + settings
│   ├── STTPanel.tsx          # Microphone recording + transcription
│   ├── TTSPanel.tsx          # Text input + voice selection + speech generation
│   ├── ConversationLog.tsx   # Message timeline with audio playback
│   └── SettingsModal.tsx     # API key, language, diarization, theme editor
├── hooks/
│   ├── useAudioRecorder.ts   # MediaRecorder wrapper
│   └── useTheme.ts           # CSS variable theme system
├── services/
│   └── mistralApi.ts         # Mistral API client (STT, TTS, Voices)
├── styles/
│   └── global.css            # CSS variables + base styles + animations
└── types/
    └── index.ts              # TypeScript interfaces
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/audio/transcriptions` | POST | Speech-to-text (file upload) |
| `/v1/audio/speech` | POST | Text-to-speech generation |
| `/v1/audio/voices` | GET | List available voices |

## Theme Customization

The app uses CSS custom properties for theming. All changes are applied in real-time and persisted to `localStorage`.

Configurable properties:
- Primary, secondary, accent colors
- Background and surface colors
- Text colors (primary + secondary)
- Border color and radius
- Font family

To customize programmatically:
```js
// In browser console
localStorage.setItem('mistral_cc_theme', JSON.stringify({
  primaryColor: '#2563eb',
  backgroundColor: '#ffffff',
  surfaceColor: '#f8fafc',
  textColor: '#1e293b'
}));
location.reload();
```

## Security Note

The API key is stored in browser `localStorage` and sent directly to `api.mistral.ai`. For production deployments, proxy API calls through your backend to avoid exposing the key in the browser.

## Build for Production

```bash
npm run build
# Output in dist/
```

Serve the `dist/` folder with any static file server.
