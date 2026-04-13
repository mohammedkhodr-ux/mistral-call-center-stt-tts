import { useState } from "react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeAudio } from "../services/mistralApi";

interface STTPanelProps {
  onTranscription: (text: string) => void;
  language: string;
  diarize: boolean;
}

export function STTPanel({ onTranscription, language, diarize }: STTPanelProps) {
  const { state, setState, duration, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();
  const [error, setError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>("");

  const handleToggleRecording = async () => {
    setError(null);

    if (state === "recording") {
      setState("processing");
      try {
        const blob = await stopRecording();
        if (blob.size === 0) {
          setError("No audio recorded");
          return;
        }
        const result = await transcribeAudio(blob, language || undefined, diarize);
        setLastTranscript(result.text);
        onTranscription(result.text);
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      try {
        await startRecording();
      } catch (err: any) {
        setError("Microphone access denied. Please allow microphone access.");
      }
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>
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
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Speech to Text
        </h3>
        <span style={styles.badge}>STT</span>
      </div>

      <div style={styles.body}>
        <div style={styles.recordArea}>
          <button
            style={{
              ...styles.recordBtn,
              ...(state === "recording" ? styles.recordBtnActive : {}),
              ...(state === "processing" ? styles.recordBtnProcessing : {}),
            }}
            onClick={handleToggleRecording}
            disabled={state === "processing"}
          >
            {state === "idle" && (
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path
                  d="M19 10v2a7 7 0 0 1-14 0v-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            )}
            {state === "recording" && (
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            )}
            {state === "processing" && (
              <div style={styles.spinner} />
            )}
          </button>

          <div style={styles.recordInfo}>
            {state === "idle" && (
              <span style={styles.hint}>Click to start recording</span>
            )}
            {state === "recording" && (
              <>
                <span style={styles.recordingLabel}>Recording...</span>
                <span style={styles.timer}>{formatDuration(duration)}</span>
              </>
            )}
            {state === "processing" && (
              <span style={styles.processingLabel}>Transcribing...</span>
            )}
          </div>

          {state === "recording" && (
            <button style={styles.cancelBtn} onClick={cancelRecording}>
              Cancel
            </button>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {lastTranscript && (
          <div style={styles.transcript}>
            <span style={styles.transcriptLabel}>Last transcription:</span>
            <p style={styles.transcriptText}>{lastTranscript}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "var(--color-surface)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
  badge: {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--color-primary)",
    background: "rgba(255, 109, 0, 0.1)",
    padding: "2px 8px",
    borderRadius: "4px",
    letterSpacing: "1px",
  },
  body: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  recordArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  recordBtn: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "var(--color-bg)",
    color: "var(--color-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--color-border)",
    flexShrink: 0,
  },
  recordBtnActive: {
    background: "var(--color-error)",
    color: "white",
    borderColor: "var(--color-error)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  recordBtnProcessing: {
    background: "var(--color-bg)",
    borderColor: "var(--color-primary)",
    cursor: "wait",
  },
  recordInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  hint: {
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
  },
  recordingLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--color-error)",
  },
  timer: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-text)",
  },
  processingLabel: {
    fontSize: "0.85rem",
    color: "var(--color-primary)",
    fontWeight: 500,
  },
  cancelBtn: {
    marginLeft: "auto",
    padding: "6px 14px",
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    borderRadius: "6px",
    border: "1px solid var(--color-border)",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "var(--color-error)",
    background: "rgba(239, 68, 68, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  transcript: {
    padding: "12px 16px",
    background: "var(--color-bg)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  },
  transcriptLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  transcriptText: {
    marginTop: "6px",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    color: "var(--color-text)",
  },
};
