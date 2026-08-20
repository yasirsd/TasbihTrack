import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Single skeleton primitive used across TasbihTrack — a subtle pulsing
 * placeholder that roughly matches the shape of the content it stands in
 * for. Respects `prefers-reduced-motion`.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "clay-skeleton animate-pulse motion-reduce:animate-none rounded-2xl bg-muted/60",
        className,
      )}
      {...props}
    />
  );
}
