import { useState } from "react";

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--color-primary)" />
            <text
              x="16"
              y="22"
              textAnchor="middle"
              fontSize="18"
              fontFamily="Arial"
              fill="white"
              fontWeight="bold"
            >
              M
            </text>
          </svg>
        </div>
        <div>
          <h1 style={styles.title}>Mistral Call Center</h1>
          <span style={styles.subtitle}>STT & TTS Console</span>
        </div>
      </div>
      <div style={styles.actions}>
        <StatusIndicator />
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

function StatusIndicator() {
  const hasKey = !!localStorage.getItem("mistral_api_key");
  return (
    <div style={styles.status}>
      <div
        style={{
          ...styles.statusDot,
          backgroundColor: hasKey ? "var(--color-success)" : "var(--color-error)",
        }}
      />
      <span style={styles.statusText}>
        {hasKey ? "API Connected" : "No API Key"}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "var(--color-text)",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
    fontWeight: 400,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
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
