import { useState, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { STTPanel } from "./components/STTPanel";
import { TTSPanel } from "./components/TTSPanel";
import { ConversationLog } from "./components/ConversationLog";
import { SettingsModal } from "./components/SettingsModal";
import { useTheme } from "./hooks/useTheme";
import type { ConversationEntry } from "./types";

export default function App() {
  const { theme, setTheme, resetTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [language, setLanguage] = useState("");
  const [diarize, setDiarize] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const addEntry = useCallback(
    (role: "customer" | "agent", text: string, audioUrl?: string) => {
      setConversation((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role,
          text,
          timestamp: new Date(),
          audioUrl,
        },
      ]);
    },
    []
  );

  const handleTranscription = useCallback(
    (text: string) => {
      addEntry("customer", text);
    },
    [addEntry]
  );

  const handleSpeechGenerated = useCallback(
    (text: string, audioUrl: string) => {
      addEntry("agent", text, audioUrl);
    },
    [addEntry]
  );

  const handlePlayAudio = useCallback((audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.play();
  }, []);

  const handleClearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  return (
    <>
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <main style={styles.main}>
        {/* Left: Controls */}
        <div style={styles.controls}>
          <STTPanel
            onTranscription={handleTranscription}
            language={language}
            diarize={diarize}
          />
          <TTSPanel onSpeechGenerated={handleSpeechGenerated} />

          {/* File upload for STT */}
          <FileUploadPanel
            onTranscription={handleTranscription}
            language={language}
            diarize={diarize}
          />
        </div>

        {/* Right: Conversation */}
        <div style={styles.conversationPanel}>
          <div style={styles.conversationHeader}>
            {conversation.length > 0 && (
              <button style={styles.clearBtn} onClick={handleClearConversation}>
                Clear All
              </button>
            )}
          </div>
          <ConversationLog
            entries={conversation}
            onPlayAudio={handlePlayAudio}
          />
        </div>
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        onThemeReset={resetTheme}
        language={language}
        onLanguageChange={setLanguage}
        diarize={diarize}
        onDiarizeChange={setDiarize}
      />
    </>
  );
}

// Inline file upload component for transcribing audio files
function FileUploadPanel({
  onTranscription,
  language,
  diarize,
}: {
  onTranscription: (text: string) => void;
  language: string;
  diarize: boolean;
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setProcessing(true);

    try {
      const { transcribeAudio } = await import("./services/mistralApi");
      const result = await transcribeAudio(file, language || undefined, diarize);
      onTranscription(result.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={fileStyles.panel}>
      <div style={fileStyles.header}>
        <h3 style={fileStyles.title}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Audio File
        </h3>
      </div>
      <div style={fileStyles.body}>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          onChange={handleFile}
          style={{ display: "none" }}
          id="audio-upload"
        />
        <label htmlFor="audio-upload" style={fileStyles.dropzone}>
          {processing ? (
            <span style={fileStyles.processingText}>
              Transcribing {fileName}...
            </span>
          ) : (
            <>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-secondary)"
                strokeWidth="1.5"
                style={{ opacity: 0.5 }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span style={fileStyles.dropText}>
                Click to upload an audio file
              </span>
              <span style={fileStyles.dropHint}>
                WAV, MP3, WebM, FLAC, OGG supported
              </span>
            </>
          )}
        </label>
        {error && <div style={fileStyles.error}>{error}</div>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0",
    flex: 1,
    overflow: "hidden",
  },
  controls: {
    padding: "20px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    borderRight: "1px solid var(--color-border)",
  },
  conversationPanel: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  conversationHeader: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "8px 20px 0",
  },
  clearBtn: {
    padding: "6px 14px",
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-surface)",
    borderRadius: "6px",
    border: "1px solid var(--color-border)",
  },
};

const fileStyles: Record<string, React.CSSProperties> = {
  panel: {
    background: "var(--color-surface)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
    overflow: "hidden",
  },
  header: {
    padding: "14px 20px",
    borderBottom: "1px solid var(--color-border)",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  body: {
    padding: "20px",
  },
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "24px",
    border: "2px dashed var(--color-border)",
    borderRadius: "var(--border-radius)",
    cursor: "pointer",
    transition: "border-color 200ms",
  },
  dropText: {
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
  },
  dropHint: {
    fontSize: "0.7rem",
    color: "var(--color-text-secondary)",
    opacity: 0.6,
  },
  processingText: {
    fontSize: "0.85rem",
    color: "var(--color-primary)",
    fontWeight: 500,
  },
  error: {
    marginTop: "12px",
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "var(--color-error)",
    background: "rgba(239, 68, 68, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
};
