export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface TranscriptionResponse {
  model: string;
  text: string;
  language: string | null;
  segments: TranscriptionSegment[];
  usage: {
    prompt_audio_seconds: number;
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens: number;
  };
}

export interface TranscriptionSegment {
  text: string;
  start?: number;
  end?: number;
  speaker?: string;
}

export interface SpeechResponse {
  audio_data: string;
}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type RecordingState = "idle" | "recording" | "processing";

export type AppMode = "chat" | "voice";

export interface ServiceCategory {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  quickQuestions: string[];
}
