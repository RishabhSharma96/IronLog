import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-sm border border-slate-border bg-abyss/80 px-4 py-2 font-mono text-xs tracking-wider text-light placeholder:text-muted",
        "transition-all duration-150",
        "focus-visible:border-neon/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon/20 focus-visible:shadow-[0_0_12px_rgba(0,240,255,0.08)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
