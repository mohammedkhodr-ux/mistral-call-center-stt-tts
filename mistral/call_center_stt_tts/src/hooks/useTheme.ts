import { useState, useEffect, useCallback } from "react";
import type { ThemeConfig } from "../types";

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#FF6D00",
  secondaryColor: "#1a1a2e",
  accentColor: "#FF8F00",
  backgroundColor: "#0f0f1a",
  surfaceColor: "#1a1a2e",
  textColor: "#f0f0f5",
  textSecondary: "#9999aa",
  borderColor: "#2a2a3e",
  borderRadius: "12px",
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const STORAGE_KEY = "mistral_cc_theme";

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primaryColor);
  root.style.setProperty("--color-secondary", theme.secondaryColor);
  root.style.setProperty("--color-accent", theme.accentColor);
  root.style.setProperty("--color-bg", theme.backgroundColor);
  root.style.setProperty("--color-surface", theme.surfaceColor);
  root.style.setProperty("--color-text", theme.textColor);
  root.style.setProperty("--color-text-secondary", theme.textSecondary);
  root.style.setProperty("--color-border", theme.borderColor);
  root.style.setProperty("--border-radius", theme.borderRadius);
  root.style.setProperty("--font-family", theme.fontFamily);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((updates: Partial<ThemeConfig>) => {
    setThemeState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetTheme = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setThemeState(DEFAULT_THEME);
  }, []);

  return { theme, setTheme, resetTheme, DEFAULT_THEME };
}
