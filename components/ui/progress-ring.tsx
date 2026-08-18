"use client";
import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ProgressRingProps {
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
  showBeads?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  percent,
  size = 220,
  stroke = 14,
  className,
  showBeads = true,
  children,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const dash = (clamped / 100) * circumference;
  const gradientId = React.useId();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDC500" />
            <stop offset="55%" stopColor="#EF233C" />
            <stop offset="100%" stopColor="#B21728" />
          </linearGradient>
          <radialGradient id={`${gradientId}-glow`}>
            <stop offset="0%" stopColor="#EF233C" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#EF233C" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.09"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - dash }}
          transition={{ duration: reduced ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        {showBeads && (
          <g>
            {Array.from({ length: 33 }).map((_, i) => {
              const angle = (i / 33) * Math.PI * 2;
              const cx = size / 2 + Math.cos(angle) * (radius + stroke * 0.9);
              const cy = size / 2 + Math.sin(angle) * (radius + stroke * 0.9);
              const isActive = i / 33 <= clamped / 100;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={1.6}
                  fill={isActive ? "#FDC500" : "currentColor"}
                  fillOpacity={isActive ? 0.9 : 0.18}
                />
              );
            })}
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
