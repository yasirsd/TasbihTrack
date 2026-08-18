"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single spinner used across TasbihTrack for asynchronous feedback.
 * A Lucide Loader2 spun with CSS — no custom SVG, no third-party spinner
 * library. Sizes match Button sizes: sm→14, md→16, lg→18.
 */
export function Spinner({
  size = "md",
  className,
  label,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const px = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center", className)}>
      <Loader2 aria-hidden className={cn(px, "animate-spin motion-reduce:animate-none")} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
