import { useState } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("mistral_api_key") || ""
  );
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("mistral_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("mistral_api_key");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.field}>
            <label style={styles.label}>Mistral API Key</label>
            <input
              style={styles.input}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Mistral API key..."
            />
            <span style={styles.hint}>
              Get your API key from{" "}
              <a
                href="https://console.mistral.ai"
                target="_blank"
                rel="noopener"
                style={styles.link}
              >
                console.mistral.ai
              </a>
            </span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Models Used</label>
            <div style={styles.modelList}>
              <div style={styles.modelItem}>
                <span style={styles.modelLabel}>Chat</span>
                <span style={styles.modelValue}>mistral-medium-latest</span>
              </div>
              <div style={styles.modelItem}>
                <span style={styles.modelLabel}>STT</span>
                <span style={styles.modelValue}>mistral-small-latest</span>
              </div>
              <div style={styles.modelItem}>
                <span style={styles.modelLabel}>TTS</span>
                <span style={styles.modelValue}>voxtral-mini-tts-2603</span>
              </div>
            </div>
          </div>

          <div style={styles.actions}>
            <button style={styles.saveBtn} onClick={handleSave}>
              {saved ? "Saved!" : "Save Settings"}
            </button>
            <button style={styles.cancelBtn} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--color-surface)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "var(--shadow-lg)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--color-border)",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    fontSize: "1.5rem",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
  },
  body: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    fontSize: "0.9rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
  },
  hint: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
  },
  link: {
    color: "var(--color-primary)",
  },
  modelList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  modelItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "var(--color-bg)",
    borderRadius: "6px",
    fontSize: "0.8rem",
  },
  modelLabel: {
    color: "var(--color-text-secondary)",
    fontWeight: 500,
  },
  modelValue: {
    color: "var(--color-primary)",
    fontFamily: "monospace",
    fontSize: "0.75rem",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  saveBtn: {
    flex: 1,
    padding: "10px 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--color-secondary)",
    background: "var(--color-primary)",
    borderRadius: "var(--border-radius)",
  },
  cancelBtn: {
    padding: "10px 20px",
    fontSize: "0.85rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
  },
};
