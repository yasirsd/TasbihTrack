import * as React from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="tt-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDC500" />
          <stop offset="60%" stopColor="#EF233C" />
          <stop offset="100%" stopColor="#B21728" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#tt-ring)" strokeWidth="4" strokeLinecap="round" strokeDasharray="122 40" transform="rotate(-90 32 32)" />
      <circle cx="32" cy="6" r="3.6" fill="#FDC500" />
      <circle cx="58" cy="32" r="2.6" fill="#EF233C" />
      <circle cx="6" cy="32" r="2.2" fill="#EF233C" opacity="0.4" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={28} />
      <span className="text-lg font-semibold tracking-tight">TasbihTrack</span>
    </div>
  );
}
