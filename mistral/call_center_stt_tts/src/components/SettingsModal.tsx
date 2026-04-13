import { useState } from "react";
import type { ThemeConfig } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onThemeChange: (updates: Partial<ThemeConfig>) => void;
  onThemeReset: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  diarize: boolean;
  onDiarizeChange: (d: boolean) => void;
}

const LANGUAGES = [
  { code: "", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "hi", label: "Hindi" },
];

const THEME_FIELDS: { key: keyof ThemeConfig; label: string; type: "color" | "text" }[] = [
  { key: "primaryColor", label: "Primary Color", type: "color" },
  { key: "secondaryColor", label: "Secondary Color", type: "color" },
  { key: "accentColor", label: "Accent Color", type: "color" },
  { key: "backgroundColor", label: "Background", type: "color" },
  { key: "surfaceColor", label: "Surface", type: "color" },
  { key: "textColor", label: "Text Color", type: "color" },
  { key: "textSecondary", label: "Text Secondary", type: "color" },
  { key: "borderColor", label: "Border Color", type: "color" },
  { key: "borderRadius", label: "Border Radius", type: "text" },
  { key: "fontFamily", label: "Font Family", type: "text" },
];

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  onThemeReset,
  language,
  onLanguageChange,
  diarize,
  onDiarizeChange,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("mistral_api_key") || ""
  );
  const [activeTab, setActiveTab] = useState<"general" | "theme">("general");

  if (!isOpen) return null;

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("mistral_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("mistral_api_key");
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Settings</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "general" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "theme" ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab("theme")}
          >
            Theme
          </button>
        </div>

        <div style={styles.modalBody}>
          {activeTab === "general" && (
            <>
              {/* API Key */}
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>API Configuration</h4>
                <div style={styles.field}>
                  <label style={styles.label}>Mistral API Key</label>
                  <div style={styles.inputRow}>
                    <input
                      type="password"
                      style={styles.input}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Mistral API key..."
                    />
                    <button style={styles.saveBtn} onClick={handleSaveApiKey}>
                      Save
                    </button>
                  </div>
                  <span style={styles.hint}>
                    Stored in browser localStorage. Get your key at{" "}
                    <a
                      href="https://console.mistral.ai/api-keys/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      console.mistral.ai
                    </a>
                  </span>
                </div>
              </div>

              {/* STT Settings */}
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>Speech-to-Text</h4>
                <div style={styles.field}>
                  <label style={styles.label}>Language</label>
                  <select
                    style={styles.select}
                    value={language}
                    onChange={(e) => onLanguageChange(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={diarize}
                      onChange={(e) => onDiarizeChange(e.target.checked)}
                      style={styles.checkbox}
                    />
                    Enable speaker diarization
                  </label>
                  <span style={styles.hint}>
                    Identifies different speakers in the audio
                  </span>
                </div>
              </div>
            </>
          )}

          {activeTab === "theme" && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h4 style={styles.sectionTitle}>Customize Theme</h4>
                <button style={styles.resetBtn} onClick={onThemeReset}>
                  Reset to Default
                </button>
              </div>
              <div style={styles.themeGrid}>
                {THEME_FIELDS.map((f) => (
                  <div key={f.key} style={styles.themeField}>
                    <label style={styles.label}>{f.label}</label>
                    {f.type === "color" ? (
                      <div style={styles.colorRow}>
                        <input
                          type="color"
                          value={theme[f.key]}
                          onChange={(e) =>
                            onThemeChange({ [f.key]: e.target.value })
                          }
                          style={styles.colorInput}
                        />
                        <input
                          type="text"
                          value={theme[f.key]}
                          onChange={(e) =>
                            onThemeChange({ [f.key]: e.target.value })
                          }
                          style={styles.colorText}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={theme[f.key]}
                        onChange={(e) =>
                          onThemeChange({ [f.key]: e.target.value })
                        }
                        style={styles.input}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "var(--color-surface)",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "var(--shadow-lg)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid var(--color-border)",
  },
  modalTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    color: "var(--color-text-secondary)",
    padding: "4px",
    display: "flex",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid var(--color-border)",
    padding: "0 24px",
  },
  tab: {
    padding: "12px 20px",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    background: "transparent",
    borderBottom: "2px solid transparent",
    marginBottom: "-1px",
  },
  tabActive: {
    color: "var(--color-primary)",
    borderBottomColor: "var(--color-primary)",
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
  },
  section: {
    marginBottom: "24px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: "16px",
  },
  field: {
    marginBottom: "14px",
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
  inputRow: {
    display: "flex",
    gap: "8px",
  },
  input: {
    flex: 1,
    padding: "10px 14px",
    fontSize: "0.9rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "calc(var(--border-radius) / 2)",
  },
  select: {
    padding: "10px 14px",
    fontSize: "0.9rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "calc(var(--border-radius) / 2)",
  },
  saveBtn: {
    padding: "10px 20px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "white",
    background: "var(--color-primary)",
    borderRadius: "calc(var(--border-radius) / 2)",
  },
  hint: {
    fontSize: "0.75rem",
    color: "var(--color-text-secondary)",
  },
  link: {
    color: "var(--color-primary)",
    textDecoration: "none",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.9rem",
    color: "var(--color-text)",
    cursor: "pointer",
  },
  checkbox: {
    accentColor: "var(--color-primary)",
    width: "16px",
    height: "16px",
  },
  resetBtn: {
    padding: "6px 14px",
    fontSize: "0.8rem",
    color: "var(--color-text-secondary)",
    background: "var(--color-bg)",
    borderRadius: "6px",
    border: "1px solid var(--color-border)",
  },
  themeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  themeField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  colorRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  colorInput: {
    width: "40px",
    height: "36px",
    padding: "2px",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    background: "var(--color-bg)",
    cursor: "pointer",
  },
  colorText: {
    flex: 1,
    padding: "8px 10px",
    fontSize: "0.8rem",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "6px",
    fontFamily: "monospace",
  },
};
