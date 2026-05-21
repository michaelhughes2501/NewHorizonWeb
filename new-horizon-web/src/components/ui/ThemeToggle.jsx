import { useTheme } from "../../hooks/useTheme.js";

/**
 * A floating toggle button (☀️ / 🌙) that switches between light and dark mode.
 * Drop it anywhere in your component tree — it reads/writes theme via useTheme.
 */
export function ThemeToggle({ style = {} }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: isDark ? "1.5px solid #4A4A52" : "1.5px solid #E8E4DC",
        background: isDark ? "#1C1C1E" : "#FAF8F4",
        color: isDark ? "#D4B07A" : "#B8975A",
        fontSize: 18,
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s, transform 0.15s",
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export default ThemeToggle;
