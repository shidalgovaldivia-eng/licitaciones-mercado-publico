import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-ocean hover:shadow-md dark:bg-white dark:text-ink dark:hover:bg-slate-200",
        secondary:
          "border border-line bg-white/80 text-ink shadow-sm hover:-translate-y-0.5 hover:border-ocean/30 hover:bg-white hover:text-ocean hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100",
        ghost: "text-slate-600 hover:bg-white hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        destructive: "bg-red-600 text-white hover:bg-red-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { buttonVariants };
