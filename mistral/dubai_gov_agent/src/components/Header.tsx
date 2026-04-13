import type { AppMode } from "../types";

interface HeaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onOpenSettings: () => void;
}

export function Header({ mode, onModeChange, onOpenSettings }: HeaderProps) {
  const hasKey = !!localStorage.getItem("mistral_api_key");

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.logo}>DDA</div>
        <div>
          <h1 style={styles.title}>Digital Dubai Authority</h1>
          <span style={styles.subtitle}>Government Services Assistant</span>
        </div>
      </div>
      <div style={styles.actions}>
        <div style={styles.status}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: hasKey
                ? "var(--color-success)"
                : "var(--color-error)",
            }}
          />
          <span style={styles.statusText}>
            {hasKey ? "API Connected" : "No API Key"}
          </span>
        </div>
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeBtn,
              ...(mode === "chat" ? styles.modeBtnActive : {}),
            }}
            onClick={() => onModeChange("chat")}
          >
            Chat
          </button>
          <button
            style={{
              ...styles.modeBtn,
              ...(mode === "voice" ? styles.modeBtnActive : {}),
            }}
            onClick={() => onModeChange("voice")}
          >
            Voice
          </button>
        </div>
        <button style={styles.settingsBtn} onClick={onOpenSettings}>
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "2px solid var(--color-primary)",
    background: "var(--color-surface)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    width: "48px",
    height: "48px",
    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--color-secondary)",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--color-primary)",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    fontWeight: 400,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  statusText: {
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
  },
  modeToggle: {
    display: "flex",
    background: "var(--color-bg)",
    borderRadius: "8px",
    overflow: "hidden",
  },
  modeBtn: {
    padding: "8px 16px",
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  modeBtnActive: {
    background: "var(--color-primary)",
    color: "var(--color-secondary)",
  },
  settingsBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    background: "var(--color-bg)",
    color: "var(--color-text-secondary)",
    borderRadius: "var(--border-radius)",
    fontSize: "0.85rem",
    border: "1px solid var(--color-border)",
  },
};
