"use client";

import { motion } from "framer-motion";

export function LiquidBackground({ focusMode }: { focusMode: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(10,132,255,0.16),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(48,209,88,0.14),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))]">
      <motion.div
        animate={focusMode ? false : { x: [0, 24, -16, 0], y: [0, -18, 22, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-[-14rem] top-20 h-[32rem] w-[32rem] rounded-full bg-sky-400/20 blur-3xl"
      />
      <motion.div
        animate={focusMode ? false : { x: [0, -22, 18, 0], y: [0, 20, -14, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[-12rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-300/20 blur-3xl"
      />
    </div>
  );
}
