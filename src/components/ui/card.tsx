import * as React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-sm border border-slate-border bg-slate-deep/90 text-light shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm hud-clip",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";
