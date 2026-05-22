import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-line bg-white/90 px-3.5 py-2 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-ocean/50 focus:bg-white focus:ring-4 focus:ring-ocean/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
