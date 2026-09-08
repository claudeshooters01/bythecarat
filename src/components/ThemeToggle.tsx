"use client";

import { useEffect, useState } from "react";

/**
 * Flips data-theme on <html>. The layout's inline script has already set it
 * before paint; this only records a manual override and keeps the icon in
 * sync with what the document is actually showing.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("btc-theme", next);
    } catch {
      // Private browsing: the choice just won't persist across visits.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-8 w-8 place-items-center rounded-full text-ink-600 hover:bg-royal-50 hover:text-ink-900"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        {theme === "dark" ? (
          <path d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 15a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1ZM4.5 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1Zm17.5 0a1 1 0 0 1-1 1h-1.5a1 1 0 1 1 0-2H21a1 1 0 0 1 1 1ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        )}
      </svg>
    </button>
  );
}
