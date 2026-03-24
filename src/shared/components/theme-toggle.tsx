"use client";

import { useTheme } from "next-themes";

import { MaterialIcon } from "@/shared/components/material-icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
    >
      {theme === "dark" ? (
        <MaterialIcon icon="dark_mode" size="sm" />
      ) : (
        <MaterialIcon icon="light_mode" size="sm" />
      )}
    </button>
  );
}
