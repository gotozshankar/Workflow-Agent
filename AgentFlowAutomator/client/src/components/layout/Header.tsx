import { Bell, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";

export function Header({ title }: { title: string }) {
  const { theme, updateTheme } = useTheme();
  const isDark = theme.mode === "dark";

  const toggleDark = () => {
    updateTheme({ mode: isDark ? "light" : "dark" });
  };

  return (
    <header className="header-glass h-14 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Pastel gradient accent pill */}
        <div
          className="h-6 w-1 rounded-full"
          style={{
            background: "linear-gradient(180deg, #B494F0, #FF9FCE)",
            opacity: 0.8,
          }}
        />
        <h1
          className="text-base font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "Lora, serif" }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={toggleDark}
          className="h-8 w-8 rounded-xl transition-colors"
          style={{
            background: isDark
              ? "rgba(232,222,255,0.12)"
              : "rgba(232,222,255,0.55)",
          }}
        >
          {isDark ? (
            <Sun className="h-4 w-4" style={{ color: "#C4A24A" }} />
          ) : (
            <Moon className="h-4 w-4" style={{ color: "#7858C8" }} />
          )}
        </Button> */}

        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-xl transition-colors"
          style={{ background: "rgba(255,218,238,0.50)" }}
        >
          <Bell className="h-4 w-4" style={{ color: "#D23C78" }} />
          <span
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full border border-white"
            style={{ background: "#FF6BAA" }}
          />
        </Button>
      </div>
    </header>
  );
}
