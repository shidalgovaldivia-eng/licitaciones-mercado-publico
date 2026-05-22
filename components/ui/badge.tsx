import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1", {
  variants: {
    variant: {
      default: "bg-ocean/10 text-ocean ring-ocean/20",
      success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      warning: "bg-amber-50 text-amber-700 ring-amber-200",
      danger: "bg-red-50 text-red-700 ring-red-200",
      muted: "bg-slate-100 text-slate-600 ring-slate-200"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
