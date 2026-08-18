import * as React from "react";
import { cn } from "@/lib/utils";

export function Glass({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_20px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl dark:bg-white/[0.03]",
        className,
      )}
      {...props}
    />
  );
}
