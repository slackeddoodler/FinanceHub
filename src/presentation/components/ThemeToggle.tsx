"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Safely wait until the component is mounted on the client to check the active theme
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return an invisible placeholder of the exact same size to prevent layout shift during load
    return <Button variant="outline" size="icon" className="w-9 h-9 opacity-0" />;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="w-9 h-9 shrink-0"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle Theme"
    >
      {theme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}