import { create } from "zustand";
import { persist } from "zustand/middleware";

const THEME_KEY = "misTrajes_theme";

const applyTheme = (theme) => {
  const resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  localStorage.setItem(THEME_KEY, resolved);
};

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: "light", // Default
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "dark" ? "light" : "dark";
          applyTheme(newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme) =>
        set(() => {
          applyTheme(theme);
          return { theme };
        }),
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        } else {
          // Fallback si no hay nada en localStorage
          applyTheme("light");
        }
      },
    },
  ),
);
