import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "luxe" | "emerald" | "amber" | "dark";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase transition-colors select-none",
        variant === "default" &&
          "bg-[#09090b] text-[#f1f5f9] border border-transparent",
        variant === "dark" &&
          "bg-[#09090b]/80 backdrop-blur-md text-[#f1f5f9] border border-white/10",
        variant === "secondary" &&
          "bg-black/[0.04] text-[#52525b] border border-black/[0.06]",
        variant === "destructive" &&
          "bg-red-500/10 text-red-500 border border-red-500/20",
        variant === "outline" &&
          "border border-black/10 text-[#52525b] bg-white",
        variant === "luxe" &&
          "bg-[#dfb15b]/15 text-[#b08728] border border-[#dfb15b]/30",
        variant === "emerald" &&
          "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
        variant === "amber" &&
          "bg-amber-500/10 text-amber-600 border border-amber-500/20",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
