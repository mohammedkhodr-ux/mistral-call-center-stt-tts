import type {
  TranscriptionResponse,
  SpeechResponse,
  ChatCompletionMessage,
  ChatCompletionResponse,
} from "../types";

const API_BASE = "https://api.mistral.ai/v1";

const CHAT_MODEL = "mistral-medium-latest";
const STT_MODEL = "mistral-small-latest";
const TTS_MODEL = "voxtral-mini-tts-2603";

function getApiKey(): string {
  const key = localStorage.getItem("mistral_api_key") || "";
  if (!key) {
    throw new Error(
      "API key not set. Please enter your Mistral API key in Settings."
    );
  }
  return key;
}

function headers(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
  };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

// --------------- Chat ---------------

export async function chatComplete(
  messages: ChatCompletionMessage[]
): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat failed (${res.status}): ${err}`);
  }

  const data: ChatCompletionResponse = await res.json();
  return data.choices[0].message.content;
}

// --------------- STT ---------------

export async function transcribeAudio(
  audioBlob: Blob
): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append("model", STT_MODEL);
  formData.append("file", audioBlob, "recording.webm");

  const res = await fetch(`${API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiKey()}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Transcription failed (${res.status}): ${err}`);
  }

  return res.json();
}

// --------------- TTS ---------------

export async function synthesizeSpeech(text: string): Promise<string> {
  const res = await fetch(`${API_BASE}/audio/speech`, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify({
      input: text,
      model: TTS_MODEL,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Speech synthesis failed (${res.status}): ${err}`);
  }

  const data: SpeechResponse = await res.json();
  return data.audio_data;
}

/** Decode base64 audio to a playable object URL */
export function base64ToAudioUrl(
  base64: string,
  mimeType = "audio/wav"
): string {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mimeType });
  return URL.createObjectURL(blob);
}
