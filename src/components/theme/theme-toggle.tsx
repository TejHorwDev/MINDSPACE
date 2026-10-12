"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={
        className ?? "size-9 text-muted-foreground hover:text-foreground"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Icons swap with a smooth rotate/scale transition — pure CSS,
          hydration-safe, no mounted state needed. */}
      <span className="relative block size-4" aria-hidden="true">
        <Sun className="absolute inset-0 size-4 -rotate-90 scale-0 transition-transform duration-300 ease-out dark:rotate-0 dark:scale-100" />
        <Moon className="absolute inset-0 size-4 rotate-0 scale-100 transition-transform duration-300 ease-out dark:-rotate-90 dark:scale-0" />
      </span>
    </Button>
  );
}
