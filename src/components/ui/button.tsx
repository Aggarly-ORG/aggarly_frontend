import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "luxe" | "dark";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    const buttonClasses = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-semibold tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
      // Variants
      variant === "default" &&
        "bg-[#09090b] text-[#f1f5f9] hover:bg-[#18181b] shadow-sm hover:shadow-md active:scale-[0.98]",
      variant === "dark" &&
        "bg-[#09090b] text-[#f1f5f9] hover:bg-[#18181b] shadow-sm hover:shadow-md active:scale-[0.98]",
      variant === "destructive" &&
        "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
      variant === "outline" &&
        "border border-black/10 bg-transparent text-[#3f3f46] hover:border-black/25 hover:bg-black/[0.03] hover:text-[#09090b] active:scale-[0.98]",
      variant === "secondary" &&
        "bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]",
      variant === "ghost" &&
        "bg-transparent text-[#52525b] hover:bg-black/[0.04] hover:text-[#09090b]",
      variant === "link" &&
        "text-[#09090b] underline-offset-4 hover:underline p-0 h-auto",
      variant === "luxe" &&
        "bg-gradient-to-r from-[#dfb15b] to-[#c59b27] text-black font-bold shadow-md hover:brightness-105 active:scale-[0.98]",
      // Sizes
      size === "default" && "h-10 px-5 py-2",
      size === "sm" && "h-8 px-3.5 py-1.5 text-[11px]",
      size === "lg" && "h-12 px-7 py-3 text-sm",
      size === "icon" && "h-9 w-9 p-0 rounded-full",
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref,
        className: cn(buttonClasses, child.props.className),
        ...props,
      });
    }

    return (
      <button className={buttonClasses} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
