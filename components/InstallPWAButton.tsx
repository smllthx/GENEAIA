"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWAButton({ compact = false }: { compact?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
    );

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function install() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setIsStandalone(true);
    }
  }

  if (isStandalone) {
    return (
      <Button variant="glass" size={compact ? "icon" : "sm"} disabled aria-label="Wallet instalada">
        <Download className="h-4 w-4" />
        {!compact && "Instalada"}
      </Button>
    );
  }

  return (
    <Button variant="glass" size={compact ? "icon" : "sm"} onClick={install} title="En iPhone: Compartir > Agregar a pantalla de inicio" aria-label="Instalar Wallet">
      <Download className="h-4 w-4" />
      {!compact && "Instalar"}
    </Button>
  );
}
