import { useState, useRef } from "react";
import type { ChatMessage, ChatCompletionMessage } from "../types";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import {
  transcribeAudio,
  chatComplete,
  synthesizeSpeech,
  base64ToAudioUrl,
} from "../services/mistralApi";
import { SYSTEM_PROMPT } from "../services/dubaiServices";

interface VoicePanelProps {
  messages: ChatMessage[];
  onAddMessage: (msg: ChatMessage) => void;
}

export function VoicePanel({ messages, onAddMessage }: VoicePanelProps) {
  const { state, setState, duration, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder();
  const [status, setStatus] = useState("Tap the circle to start speaking");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<ChatCompletionMessage[]>([SYSTEM_PROMPT]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleToggle = async () => {
    setError(null);

    if (state === "idle") {
      try {
        await startRecording();
        setStatus("Listening... Tap again to stop");
        setTranscript("");
      } catch {
        setError("Microphone access denied. Please allow microphone access.");
      }
    } else if (state === "recording") {
      setState("processing");
      setStatus("Processing your request...");

      try {
        const blob = await stopRecording();
        if (blob.size === 0) {
          setError("No audio recorded");
          setStatus("Tap the circle to start speaking");
          return;
        }

        // 1. STT
        setStatus("Transcribing...");
        const sttResult = await transcribeAudio(blob);
        const text = sttResult.text;
        setTranscript(text);

        if (!text.trim()) {
          setStatus("Didn't catch that. Try again.");
          setState("idle");
          return;
        }

        const userMsg: ChatMessage = {
          id: `${Date.now()}-user`,
          role: "user",
          content: text,
          timestamp: new Date(),
        };
        onAddMessage(userMsg);
        historyRef.current.push({ role: "user", content: text });

        // 2. Chat
        setStatus("Thinking...");
        const reply = await chatComplete(historyRef.current);
        historyRef.current.push({ role: "assistant", content: reply });

        const assistantMsg: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };
        onAddMessage(assistantMsg);

        // 3. TTS
        setStatus("Speaking...");
        try {
          const audioBase64 = await synthesizeSpeech(reply);
          const url = base64ToAudioUrl(audioBase64);
          const audio = new Audio(url);
          audio.play();
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setStatus("Response ready. Tap to speak again.");
          };
        } catch {
          setStatus("Response ready (audio unavailable). Tap to speak again.");
        }
      } catch (err: any) {
        setError(err.message);
        setStatus("Error occurred. Tap to try again.");
      } finally {
        setState("idle");
      }
    }
  };

  const ringStyle: React.CSSProperties = {
    ...styles.ring,
    ...(state === "recording" ? styles.ringListening : {}),
    ...(state === "processing" ? styles.ringProcessing : {}),
  };

  return (
    <div style={styles.container}>
      <div style={styles.center}>
        <button style={ringStyle} onClick={handleToggle} disabled={state === "processing"}>
          {state === "idle" && (
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
          {state === "recording" && (
            <div style={styles.recordingInner}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="var(--color-error)"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span style={styles.timer}>{formatDuration(duration)}</span>
            </div>
          )}
          {state === "processing" && <div style={styles.spinner} />}
        </button>

        <p style={styles.status}>{status}</p>

        {transcript && (
          <div style={styles.transcript}>
            <span style={styles.transcriptLabel}>You said:</span>
            <p style={styles.transcriptText}>{transcript}</p>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {state === "recording" && (
          <button style={styles.cancelBtn} onClick={cancelRecording}>
            Cancel
          </button>
        )}
      </div>

      {/* Recent messages in voice mode */}
      {messages.length > 0 && (
        <div style={styles.recentMessages}>
          <h4 style={styles.recentTitle}>Recent</h4>
          {messages.slice(-6).map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.recentMsg,
                ...(msg.role === "user" ? styles.recentUser : styles.recentAssistant),
              }}
            >
              <span style={styles.recentRole}>
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              <p style={styles.recentText}>
                {msg.content.length > 120
                  ? msg.content.slice(0, 120) + "..."
                  : msg.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "24px",
    padding: "40px",
  },
  ring: {
    width: "160px",
    height: "160px",
    borderRadius: "50%",
    border: "3px solid var(--color-primary)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexDirection: "column",
    gap: "4px",
  },
  ringListening: {
    animation: "ringPulse 1.5s infinite",
    borderColor: "var(--color-error)",
  },
  ringProcessing: {
    borderColor: "var(--color-primary)",
    cursor: "wait",
    opacity: 0.7,
  },
  recordingInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  timer: {
    fontSize: "1.2rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "var(--color-error)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  status: {
    fontSize: "1rem",
    color: "var(--color-text-secondary)",
    textAlign: "center" as const,
  },
  transcript: {
    maxWidth: "500px",
    padding: "12px 16px",
    background: "var(--color-surface)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    textAlign: "center" as const,
  },
  transcriptLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  transcriptText: {
    marginTop: "4px",
    fontSize: "0.9rem",
    color: "var(--color-text)",
  },
  error: {
    maxWidth: "400px",
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "var(--color-error)",
    background: "rgba(239, 68, 68, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    textAlign: "center" as const,
  },
  cancelBtn: {
    padding: "8px 20px",
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-surface)",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  },
  recentMessages: {
    borderTop: "1px solid var(--color-border)",
    padding: "16px 24px",
    maxHeight: "200px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  recentTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  recentMsg: {
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "0.8rem",
  },
  recentUser: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
  },
  recentAssistant: {
    background: "rgba(197, 164, 78, 0.08)",
    border: "1px solid rgba(197, 164, 78, 0.2)",
  },
  recentRole: {
    fontSize: "0.65rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  recentText: {
    marginTop: "2px",
    color: "var(--color-text)",
    lineHeight: 1.4,
  },
};
