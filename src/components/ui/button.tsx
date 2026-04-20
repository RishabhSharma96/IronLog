import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[0.15em] transition-all disabled:pointer-events-none disabled:opacity-30",
  {
    variants: {
      variant: {
        default:
          "bg-neon/10 text-neon border border-neon/40 shadow-[0_0_12px_rgba(0,240,255,0.15),inset_0_0_12px_rgba(0,240,255,0.05)] hover:bg-neon/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] active:bg-neon/25",
        ghost: "bg-transparent text-dim hover:text-neon hover:bg-neon/5",
        outline:
          "border border-slate-border text-soft hover:border-neon/30 hover:text-neon hover:bg-neon/5",
        dashed:
          "border border-dashed border-steel text-muted hover:border-neon/40 hover:text-neon",
        destructive: "bg-hp/10 text-hp border border-hp/30 hover:bg-hp/20",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-sm",
        sm: "h-7 px-3 py-1 text-[10px] rounded-sm",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
