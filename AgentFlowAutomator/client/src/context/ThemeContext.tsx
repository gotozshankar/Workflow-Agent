import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  darkSidebar: boolean;
}

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (settings: Partial<ThemeSettings>) => void;
  resetTheme: () => void;
}

const DEFAULT_THEME: ThemeSettings = {
  mode: "light",
  primaryColor: "#9B7FD4",
  darkSidebar: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    // Read synchronously to avoid flash
    try {
      const saved = localStorage.getItem("theme-settings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_THEME;
  });

  // Apply dark class immediately on every theme change
  useEffect(() => {
    const root = document.documentElement;
    const applyDark = (dark: boolean) => {
      if (dark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme.mode === "dark") {
      applyDark(true);
    } else if (theme.mode === "light") {
      applyDark(false);
    } else {
      // system
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    // Persist
    localStorage.setItem("theme-settings", JSON.stringify(theme));
  }, [theme]);

  const updateTheme = (settings: Partial<ThemeSettings>) => {
    setTheme((prev) => ({ ...prev, ...settings }));
  };

  const resetTheme = () => setTheme(DEFAULT_THEME);

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
