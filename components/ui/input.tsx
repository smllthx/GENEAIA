import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm outline-none backdrop-blur placeholder:text-muted-foreground focus:ring-2 focus:ring-ring dark:bg-white/10",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
