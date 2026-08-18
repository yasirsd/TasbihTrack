"use client";
import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

export function BeadHero() {
  const reduced = useReducedMotion();
  const beads = Array.from({ length: 22 });
  return (
    <div className="relative aspect-square w-full max-w-[420px]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(239,35,60,0.18),transparent_60%)] blur-2xl" />
      <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_top,rgba(253,197,0,0.16),transparent_50%)] blur-xl" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full">
        <defs>
          <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDC500" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#EF233C" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#B21728" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="bead" cx="0.3" cy="0.3" r="0.9">
            <stop offset="0%" stopColor="#FFE9B0" />
            <stop offset="55%" stopColor="#EF233C" />
            <stop offset="100%" stopColor="#5b0a13" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="150" fill="none" stroke="url(#arc)" strokeWidth="2" strokeOpacity="0.55" />
        <circle cx="200" cy="200" r="120" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
        {beads.map((_, i) => {
          const angle = (i / beads.length) * Math.PI * 2 - Math.PI / 2;
          const r = 150;
          const cx = 200 + Math.cos(angle) * r;
          const cy = 200 + Math.sin(angle) * r;
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={7}
              fill="url(#bead)"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: reduced ? 0 : [0, -2, 0],
              }}
              transition={{
                delay: 0.04 * i,
                duration: reduced ? 0.6 : 2.8 + (i % 5) * 0.2,
                repeat: reduced ? 0 : Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
        <motion.circle
          cx="200"
          cy="50"
          r="12"
          fill="#FDC500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        />
      </svg>
    </div>
  );
}
