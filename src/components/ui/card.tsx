import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-zinc-800 bg-[#1a1a1a] text-zinc-100", className)} {...props} />;
}
