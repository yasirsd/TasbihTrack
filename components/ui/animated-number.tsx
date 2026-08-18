"use client";
import * as React from "react";
import { useReducedMotion } from "motion/react";
import { formatNumber } from "@/lib/format";

export function AnimatedNumber({
  value,
  duration = 900,
  className,
  format = formatNumber,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const prev = React.useRef(value);
  const frame = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reduced || duration <= 0) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reduced]);

  return <span className={className}>{format(display)}</span>;
}
