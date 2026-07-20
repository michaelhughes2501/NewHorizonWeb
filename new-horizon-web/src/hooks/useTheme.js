import { useState, useEffect } from "react";

const STORAGE_KEY = "nh-theme";

/**
 * Manages dark/light mode with localStorage persistence
 * and system preference detection via window.matchMedia.
 *
 * Returns { theme, isDark, toggleTheme, setTheme }
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // 1. Check localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // localStorage unavailable (SSR / private browsing edge cases)
    }
    // 2. Fall back to system preference
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  // Apply theme to <html> element and persist to localStorage on change
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (e.g., private browsing)
    }
  }, [theme]);

  // Listen for OS-level preference changes (only if user hasn't overridden)
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;

    const handler = (e) => {
      // Only follow system if no user preference is saved
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) setThemeState(e.matches ? "dark" : "light");
      } catch {
        setThemeState(e.matches ? "dark" : "light");
      }
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = (newTheme) => {
    if (newTheme === "dark" || newTheme === "light") setThemeState(newTheme);
  };

  const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));

  return { theme, isDark: theme === "dark", toggleTheme, setTheme };
}

export default useTheme;
