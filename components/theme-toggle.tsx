"use client";

import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Force light mode only
    setIsDark(false);
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }, []);

  // Disabled toggle - always light mode
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled
      aria-label="Light mode (theme toggle disabled)"
      className="backdrop-blur-sm bg-white/10 border border-white/20 text-white/50 cursor-not-allowed rounded-xl opacity-50"
    >
      <SunIcon className="h-4 w-4" />
    </Button>
  );
}