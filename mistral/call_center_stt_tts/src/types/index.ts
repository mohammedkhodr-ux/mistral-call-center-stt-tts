export interface Voice {
  id: string;
  name: string;
  created_at: string;
  user_id: string | null;
  gender?: string | null;
  age?: number | null;
  languages?: string[];
  tags?: string[] | null;
  color?: string | null;
  slug?: string | null;
}

export interface VoiceListResponse {
  items: Voice[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TranscriptionSegment {
  text: string;
  start?: number;
  end?: number;
  speaker?: string;
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

export interface SpeechResponse {
  audio_data: string;
}

export interface ConversationEntry {
  id: string;
  role: "customer" | "agent";
  text: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  borderRadius: string;
  fontFamily: string;
}

export type RecordingState = "idle" | "recording" | "processing";
export type TTSState = "idle" | "generating" | "playing";
