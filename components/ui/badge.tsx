import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-white/30 bg-white/55 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur dark:bg-white/10",
        className
      )}
      {...props}
    />
  );
}
