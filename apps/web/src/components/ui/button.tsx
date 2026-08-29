// apps/web/src/components/ui/button.tsx

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded font-sans text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-hover",
        outline: "border border-border text-foreground hover:bg-surface",
        ghost: "text-muted hover:text-foreground hover:bg-surface",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** When true, merges button styles into the single child element instead of rendering a <button>. */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const computedClass = cn(buttonVariants({ variant, size }), className);

    if (asChild && children) {
      const child = children as ReactElement<Record<string, unknown>>;
      return {
        ...child,
        props: {
          ...child.props,
          className: cn(computedClass, child.props.className as string | undefined),
        },
      } as ReactElement;
    }

    return (
      <button ref={ref} className={computedClass} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
