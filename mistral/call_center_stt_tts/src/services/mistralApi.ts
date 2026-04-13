import type {
  TranscriptionResponse,
  SpeechResponse,
  VoiceListResponse,
} from "../types";

const API_BASE = "https://api.mistral.ai/v1";

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

/** Convert a Blob to base64 data string (no prefix) */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --------------- STT ---------------

export async function transcribeAudio(
  audioBlob: Blob,
  language?: string,
  diarize = false
): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append("model", "mistral-small-latest");
  formData.append("file", audioBlob, "recording.webm");
  if (language) formData.append("language", language);
  formData.append("diarize", String(diarize));

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

export async function synthesizeSpeech(
  text: string,
  voiceId?: string
): Promise<string> {
  const body: Record<string, unknown> = { input: text };
  if (voiceId) body.voice_id = voiceId;

  const res = await fetch(`${API_BASE}/audio/speech`, {
    method: "POST",
    headers: headers("application/json"),
    body: JSON.stringify(body),
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

// --------------- Voices ---------------

export async function listVoices(): Promise<VoiceListResponse> {
  const res = await fetch(`${API_BASE}/audio/voices`, {
    method: "GET",
    headers: headers(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list voices (${res.status}): ${err}`);
  }

  return res.json();
}
