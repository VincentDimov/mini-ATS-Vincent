"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
function subscribe(callback: () => void) {
  window.addEventListener("mini-ats-theme", callback);
  return () => window.removeEventListener("mini-ats-theme", callback);
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        document.documentElement.classList.toggle("dark", !dark);
        document.cookie =
          "mini-ats-theme=" +
          (!dark ? "dark" : "light") +
          "; path=/; max-age=31536000; SameSite=Lax";
        window.dispatchEvent(new Event("mini-ats-theme"));
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
