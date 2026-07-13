"use client";

import { motion } from "framer-motion";

export function LiquidBackground({ focusMode }: { focusMode: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(160deg,rgba(10,132,255,0.10),transparent_38%),linear-gradient(25deg,rgba(48,209,88,0.09),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))]">
      <motion.div
        animate={focusMode ? false : { opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-[linear-gradient(115deg,transparent_15%,rgba(255,255,255,0.18)_48%,transparent_78%)]"
      />
    </div>
  );
}
