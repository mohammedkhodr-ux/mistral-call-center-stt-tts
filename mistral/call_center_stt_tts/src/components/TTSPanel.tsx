import { useState, useEffect, useRef } from "react";
import {
  synthesizeSpeech,
  base64ToAudioUrl,
  listVoices,
} from "../services/mistralApi";
import type { Voice, TTSState } from "../types";

interface TTSPanelProps {
  onSpeechGenerated: (text: string, audioUrl: string) => void;
}

export function TTSPanel({ onSpeechGenerated }: TTSPanelProps) {
  const [text, setText] = useState("");
  const [ttsState, setTtsState] = useState<TTSState>("idle");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    setLoadingVoices(true);
    try {
      const res = await listVoices();
      setVoices(res.items);
      if (res.items.length > 0 && !selectedVoice) {
        setSelectedVoice(res.items[0].id);
      }
    } catch (err: any) {
      // Voices are optional; don't block on failure
      console.warn("Could not load voices:", err.message);
    } finally {
      setLoadingVoices(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setError(null);
    setTtsState("generating");

    try {
      const audioBase64 = await synthesizeSpeech(
        text.trim(),
        selectedVoice || undefined
      );
      const audioUrl = base64ToAudioUrl(audioBase64);

      setTtsState("playing");
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setTtsState("idle");
      audio.onerror = () => {
        setTtsState("idle");
        setError("Audio playback failed");
      };
      await audio.play();

      onSpeechGenerated(text.trim(), audioUrl);
    } catch (err: any) {
      setError(err.message);
      setTtsState("idle");
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTtsState("idle");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Text to Speech
        </h3>
        <span style={styles.badge}>TTS</span>
      </div>

      <div style={styles.body}>
        {/* Voice selector */}
        <div style={styles.field}>
          <label style={styles.label}>Voice</label>
          <div style={styles.voiceRow}>
            <select
              style={styles.select}
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={loadingVoices}
            >
              <option value="">Default voice</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.gender ? ` (${v.gender})` : ""}
                  {v.languages && v.languages.length > 0
                    ? ` - ${v.languages.join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
            <button
              style={styles.refreshBtn}
              onClick={loadVoices}
              disabled={loadingVoices}
              title="Refresh voices"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={loadingVoices ? { animation: "spin 1s linear infinite" } : {}}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Text input */}
        <div style={styles.field}>
          <label style={styles.label}>Agent Response</label>
          <textarea
            style={styles.textarea}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type the agent response to convert to speech..."
            rows={4}
            disabled={ttsState !== "idle"}
          />
          <span style={styles.charCount}>{text.length} characters</span>
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

        {/* Action buttons */}
        <div style={styles.actions}>
          {ttsState === "playing" ? (
            <button style={styles.stopBtn} onClick={handleStop}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop Playback
            </button>
          ) : (
            <button
              style={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!text.trim() || ttsState === "generating"}
            >
              {ttsState === "generating" ? (
                <>
                  <div style={styles.spinnerSmall} />
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Generate Speech
                </>
              )}
            </button>
          )}
          <button
            style={styles.clearBtn}
            onClick={() => setText("")}
            disabled={!text || ttsState !== "idle"}
          >
            Clear
          </button>
        </div>
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
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  voiceRow: {
    display: "flex",
    gap: "8px",
  },
  select: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "0.9rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "calc(var(--border-radius) / 2)",
  },
  refreshBtn: {
    padding: "10px",
    background: "var(--color-bg)",
    color: "var(--color-text-secondary)",
    border: "1px solid var(--color-border)",
    borderRadius: "calc(var(--border-radius) / 2)",
    display: "flex",
    alignItems: "center",
  },
  textarea: {
    width: "100%",
    resize: "vertical" as const,
    minHeight: "100px",
    padding: "12px 14px",
    fontSize: "0.9rem",
    lineHeight: 1.5,
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "calc(var(--border-radius) / 2)",
    fontFamily: "var(--font-family)",
  },
  charCount: {
    fontSize: "0.7rem",
    color: "var(--color-text-secondary)",
    alignSelf: "flex-end",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  generateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "white",
    background: "var(--color-primary)",
    borderRadius: "var(--border-radius)",
    flex: 1,
    justifyContent: "center",
  },
  stopBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "white",
    background: "var(--color-error)",
    borderRadius: "var(--border-radius)",
    flex: 1,
    justifyContent: "center",
  },
  clearBtn: {
    padding: "10px 20px",
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
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
  spinnerSmall: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
