"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Standard variants keep the pre-Phase-5 visuals so screens that use them
// look identical to before.
//
// Clay overrides come from globals.css: each Clay class (`.clay-btn`,
// `.clay-btn-primary`, etc.) is scoped to `[data-ui-style="clay"]` so
// applying them unconditionally is a no-op in Standard.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] touch-manipulation clay-btn",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90 shadow-[0_1px_0_0_hsl(var(--foreground)/0.05)] clay-btn-primary",
        crimson:
          "bg-gradient-to-br from-[hsl(var(--brand-1))] to-[hsl(var(--brand-2))] text-white shadow-[0_10px_30px_-12px_hsl(var(--brand-1)/0.55)] hover:brightness-105 clay-btn-primary",
        gold:
          "bg-gradient-to-br from-gold-soft to-gold text-neutral-900 shadow-[0_10px_30px_-12px_hsl(var(--brand-gold)/0.55)] hover:brightness-105 clay-btn-primary",
        outline:
          "border border-border/70 bg-transparent hover:bg-muted/40 text-foreground clay-btn-outline",
        subtle: "bg-muted/50 hover:bg-muted text-foreground clay-btn-ghost",
        ghost: "hover:bg-muted/40 text-foreground clay-btn-ghost",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline rounded-none px-0",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        // xl is the primary-CTA size (Phase 7.2 P0.6 touch-target audit).
        // 56 px is comfortably above the 48 px mobile threshold and reads
        // as the dominant action on the page (Sign In / Create Account /
        // Create Goal / Save Profile).
        xl: "h-14 px-7 text-base font-semibold",
        icon: "h-10 w-10 p-0",
        pill: "h-9 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
