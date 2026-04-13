import { useState, useRef, useEffect } from "react";
import type { ChatMessage, ChatCompletionMessage } from "../types";
import { chatComplete, synthesizeSpeech, base64ToAudioUrl } from "../services/mistralApi";
import { SYSTEM_PROMPT, SERVICE_CATEGORIES } from "../services/dubaiServices";

interface ChatPanelProps {
  messages: ChatMessage[];
  onAddMessage: (msg: ChatMessage) => void;
}

export function ChatPanel({ messages, onAddMessage }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<ChatCompletionMessage[]>([SYSTEM_PROMPT]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    onAddMessage(userMsg);
    historyRef.current.push({ role: "user", content: text.trim() });

    setIsLoading(true);
    try {
      const reply = await chatComplete(historyRef.current);
      historyRef.current.push({ role: "assistant", content: reply });

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      onAddMessage(assistantMsg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      const audioBase64 = await synthesizeSpeech(text);
      const url = base64ToAudioUrl(audioBase64);
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("TTS error:", err.message);
    }
  };

  const renderContent = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, "<br>");
    return { __html: html };
  };

  const showWelcome = messages.length === 0;

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {showWelcome && (
          <div style={styles.welcome}>
            <div style={styles.welcomeLogo}>DDA</div>
            <h2 style={styles.welcomeTitle}>Marhaba! Welcome to Dubai Gov Services</h2>
            <p style={styles.welcomeText}>
              I'm your AI assistant for Digital Dubai Authority. I can help you
              with visa &amp; residency, business licensing, housing, transport,
              health, and other government services.
            </p>
            <div style={styles.categories}>
              {SERVICE_CATEGORIES.map((cat) => (
                <div key={cat.id} style={styles.categoryCard}>
                  <div style={styles.categoryHeader}>
                    <span style={styles.categoryLabel}>{cat.label}</span>
                    <span style={styles.categoryLabelAr}>{cat.labelAr}</span>
                  </div>
                  <div style={styles.quickQuestions}>
                    {cat.quickQuestions.map((q) => (
                      <button
                        key={q}
                        style={styles.quickBtn}
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.msg,
              ...(msg.role === "user" ? styles.userMsg : {}),
              ...(msg.role === "assistant" ? styles.assistantMsg : {}),
              ...(msg.role === "system" ? styles.systemMsg : {}),
            }}
          >
            {msg.role === "assistant" ? (
              <>
                <div dangerouslySetInnerHTML={renderContent(msg.content)} />
                <button
                  style={styles.speakBtn}
                  onClick={() => handleSpeak(msg.content)}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path
                      d="M15.54 8.46a5 5 0 0 1 0 7.07"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Listen
                </button>
              </>
            ) : (
              msg.content
            )}
          </div>
        ))}

        {isLoading && (
          <div style={styles.typing}>
            <span style={styles.dot} />
            <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
            <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div ref={bottomRef} />
      </div>

      <div style={styles.inputBar}>
        <textarea
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question about Dubai government services..."
          rows={1}
          disabled={isLoading}
        />
        <button
          style={styles.sendBtn}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
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
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  msg: {
    maxWidth: "720px",
    padding: "14px 18px",
    borderRadius: "12px",
    lineHeight: 1.55,
    fontSize: "0.9rem",
    whiteSpace: "pre-wrap" as const,
    animation: "fadeIn 0.25s ease",
  },
  userMsg: {
    alignSelf: "flex-end",
    background: "var(--color-blue)",
    color: "#fff",
    borderBottomRightRadius: "4px",
  },
  assistantMsg: {
    alignSelf: "flex-start",
    background: "var(--color-surface)",
    border: "1px solid rgba(197, 164, 78, 0.2)",
    borderBottomLeftRadius: "4px",
  },
  systemMsg: {
    alignSelf: "center",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontSize: "0.8rem",
    textAlign: "center" as const,
  },
  speakBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "8px",
    padding: "4px 10px",
    background: "rgba(197, 164, 78, 0.15)",
    border: "1px solid var(--color-primary)",
    borderRadius: "6px",
    color: "var(--color-primary)",
    fontSize: "0.75rem",
  },
  typing: {
    alignSelf: "flex-start",
    display: "flex",
    gap: "6px",
    padding: "14px 18px",
    background: "var(--color-surface)",
    borderRadius: "12px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--color-primary)",
    animation: "bounce 1.4s infinite",
  },
  error: {
    alignSelf: "center",
    padding: "10px 14px",
    fontSize: "0.8rem",
    color: "var(--color-error)",
    background: "rgba(239, 68, 68, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  inputBar: {
    flexShrink: 0,
    background: "var(--color-surface)",
    borderTop: "1px solid var(--color-border)",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "10px",
    color: "var(--color-text)",
    fontSize: "0.9rem",
    resize: "none" as const,
    minHeight: "44px",
    maxHeight: "120px",
    fontFamily: "var(--font-family)",
  },
  sendBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "var(--color-primary)",
    color: "var(--color-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  // Welcome
  welcome: {
    textAlign: "center" as const,
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  welcomeLogo: {
    width: "64px",
    height: "64px",
    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 800,
    color: "var(--color-secondary)",
  },
  welcomeTitle: {
    color: "var(--color-primary)",
    fontSize: "1.4rem",
  },
  welcomeText: {
    color: "var(--color-text-secondary)",
    maxWidth: "480px",
    fontSize: "0.9rem",
    lineHeight: 1.6,
  },
  categories: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "12px",
    width: "100%",
    maxWidth: "900px",
    marginTop: "8px",
  },
  categoryCard: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "left" as const,
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  categoryLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--color-primary)",
  },
  categoryLabelAr: {
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    direction: "rtl" as const,
  },
  quickQuestions: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  quickBtn: {
    padding: "8px 12px",
    borderRadius: "8px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text)",
    fontSize: "0.8rem",
    textAlign: "left" as const,
    cursor: "pointer",
  },
};
