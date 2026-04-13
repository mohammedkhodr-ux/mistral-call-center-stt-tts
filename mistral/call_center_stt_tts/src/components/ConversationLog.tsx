import { useEffect, useRef } from "react";
import type { ConversationEntry } from "../types";

interface ConversationLogProps {
  entries: ConversationEntry[];
  onPlayAudio: (audioUrl: string) => void;
}

export function ConversationLog({ entries, onPlayAudio }: ConversationLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div style={styles.empty}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.4 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p style={styles.emptyText}>No conversation yet</p>
        <p style={styles.emptyHint}>
          Use the microphone to record customer speech, or type a response to
          generate agent audio.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Conversation Log</h3>
        <span style={styles.count}>{entries.length} messages</span>
      </div>
      <div style={styles.messages}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              ...styles.message,
              ...(entry.role === "agent" ? styles.agentMsg : styles.customerMsg),
            }}
          >
            <div style={styles.msgHeader}>
              <span
                style={{
                  ...styles.role,
                  color:
                    entry.role === "agent"
                      ? "var(--color-primary)"
                      : "var(--color-accent)",
                }}
              >
                {entry.role === "agent" ? "Agent" : "Customer"}
              </span>
              <span style={styles.time}>
                {entry.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
            <p style={styles.msgText}>{entry.text}</p>
            {entry.audioUrl && (
              <button
                style={styles.playBtn}
                onClick={() => onPlayAudio(entry.audioUrl!)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play Audio
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid var(--color-border)",
  },
  title: {
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  count: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    padding: "2px 10px",
    borderRadius: "12px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  message: {
    padding: "12px 16px",
    borderRadius: "var(--border-radius)",
    maxWidth: "85%",
  },
  customerMsg: {
    alignSelf: "flex-start",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
  },
  agentMsg: {
    alignSelf: "flex-end",
    background: "rgba(255, 109, 0, 0.08)",
    border: "1px solid rgba(255, 109, 0, 0.2)",
  },
  msgHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  role: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  time: {
    fontSize: "0.7rem",
    color: "var(--color-text-secondary)",
  },
  msgText: {
    fontSize: "0.9rem",
    lineHeight: 1.5,
    color: "var(--color-text)",
  },
  playBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "8px",
    padding: "4px 10px",
    fontSize: "0.75rem",
    color: "var(--color-primary)",
    background: "transparent",
    border: "1px solid var(--color-primary)",
    borderRadius: "6px",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "12px",
    padding: "40px",
  },
  emptyText: {
    fontSize: "1rem",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  },
  emptyHint: {
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
    textAlign: "center" as const,
    maxWidth: "360px",
    opacity: 0.7,
  },
};
