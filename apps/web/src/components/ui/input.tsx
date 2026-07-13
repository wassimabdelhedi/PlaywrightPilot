// apps/web/src/components/ui/input.tsx

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-primary",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
