import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = true }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      whileTap={{ scale: 0.92 }}
      className={`inline-flex items-center justify-center rounded-lg border border-border/70 bg-background/70 text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-accent ${compact ? "h-9 w-9" : "h-10 gap-2 px-3"}`}
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact ? <span className="text-xs font-semibold">{dark ? "Claro" : "Escuro"}</span> : null}
    </motion.button>
  );
}
