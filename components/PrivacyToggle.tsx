"use client";

import { EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrivacyToggle({
  hidden,
  focusMode,
  onToggleHidden,
  onToggleFocus
}: {
  hidden: boolean;
  focusMode: boolean;
  onToggleHidden: () => void;
  onToggleFocus: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant={hidden ? "default" : "glass"} size="icon" onClick={onToggleHidden} aria-label="Modo privacidad">
        <EyeOff className="h-4 w-4" />
      </Button>
      <Button variant={focusMode ? "default" : "glass"} size="icon" onClick={onToggleFocus} aria-label="Modo concentración" title="Modo concentración">
        <ShieldCheck className="h-4 w-4" />
      </Button>
    </div>
  );
}
