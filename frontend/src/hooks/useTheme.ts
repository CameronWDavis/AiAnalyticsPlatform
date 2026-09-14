import { useCallback, useEffect, useState } from "react";
import type { ChartMode } from "../lib/palette";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "ai-analytics.theme";

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Private browsing or blocked site data — fall back to the default.
  }
  // Light by default: the landing page is designed as a white surface. Dark is
  // one click away and is remembered per browser once chosen.
  return "light";
}

/**
 * Keeps the `data-theme` stamp, the stored preference, and the resolved mode in
 * sync. Charts need the resolved mode because SVG marks take literal colours,
 * not CSS custom properties.
 */
export function useTheme(): {
  preference: ThemePreference;
  mode: ChartMode;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [systemMode, setSystemMode] = useState<ChartMode>(() =>
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemMode(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", preference);

    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Not being able to remember the choice is not worth failing a render over.
    }
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), []);
  const mode: ChartMode = preference === "system" ? systemMode : preference;
  const toggle = useCallback(() => setPreferenceState(mode === "dark" ? "light" : "dark"), [mode]);

  return { preference, mode, setPreference, toggle };
}
