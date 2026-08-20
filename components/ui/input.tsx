"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Standard input: subtle bordered rectangle. Placeholder uses the
 * `--placeholder` token (weaker than `--muted-foreground`) so an actual
 * typed value reads unmistakably stronger than the example text
 * (see PROMPT 5A §5).
 *
 * Clay mode: the `.clay-input` styles in globals.css are scoped to
 * `[data-ui-style="clay"]`, so the class is a no-op in Standard and
 * repaints the field as a pressed cavity in Clay.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "clay-input flex h-12 w-full rounded-2xl border border-border/70 bg-background/60 px-4 text-base text-foreground shadow-sm transition-colors placeholder:text-[hsl(var(--placeholder))] placeholder:font-normal focus-visible:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
