"use client";
import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Recognizable Tasbih (prayer-bead strand) — not an orbit, not a loading
 * spinner. Structure:
 *
 *   • a curved "string" (Bezier arc) that reads as the thread
 *   • a run of small round beads spaced along it, each with a highlight
 *     that suggests dimensional volume
 *   • an accent divider bead (larger, gold-lit) marking a phrase break
 *   • a small tassel at the loop terminal
 *
 * Motion is deliberately subtle: each bead breathes ~1–2% in place, and
 * a very slow drift moves the whole strand a few pixels — no continuous
 * rotation. Respects `prefers-reduced-motion`.
 */
export function TasbihHero({ compact = false }: { compact?: boolean }) {
  const reduced = useReducedMotion();

  // Compact mode shrinks the visual on registration + short phones. The
  // clamp ties the actual pixel size to the viewport so the hero can never
  // push Sign In below the fold.
  const sizeClass = compact
    ? "w-[clamp(96px,30dvw,140px)]"
    : "w-[clamp(140px,42dvw,240px)]";

  return (
    <div className={`relative ${sizeClass} aspect-square select-none`}>
      <svg viewBox="0 0 240 240" className="h-full w-full">
        <defs>
          {/* Bead material — deep crimson with soft highlight for depth */}
          <radialGradient id="tt-bead" cx="0.35" cy="0.32" r="0.75">
            <stop offset="0%" stopColor="#FFD4C4" stopOpacity="0.9" />
            <stop offset="20%" stopColor="#F16A7A" />
            <stop offset="60%" stopColor="#B21728" />
            <stop offset="100%" stopColor="#5b0a13" />
          </radialGradient>
          {/* Divider (accent) bead — gold */}
          <radialGradient id="tt-accent" cx="0.35" cy="0.32" r="0.75">
            <stop offset="0%" stopColor="#FFF3B0" />
            <stop offset="35%" stopColor="#FDC500" />
            <stop offset="100%" stopColor="#8a6a00" />
          </radialGradient>
          {/* Soft ambient glow behind the strand */}
          <radialGradient id="tt-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(239,35,60,0.28)" />
            <stop offset="100%" stopColor="rgba(239,35,60,0)" />
          </radialGradient>
          {/* String — subtle taupe with a soft edge */}
          <linearGradient id="tt-string" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C0A778" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7C6338" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx="120" cy="120" r="110" fill="url(#tt-glow)" />

        {/* --- Strand ------------------------------------------------------
             We define ONE cubic Bezier from `beadPath` and place beads at
             even parametric distances along it via t = i/(N-1). The path
             is an open arc — a partial loop that reads as a hand-held
             strand rather than a closed necklace. */}
        <motion.g
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            y: reduced ? 0 : [0, -1.5, 0],
          }}
          transition={{
            opacity: { duration: 0.7 },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          {/* String */}
          <path
            d={STRAND_PATH}
            fill="none"
            stroke="url(#tt-string)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Beads */}
          {BEAD_TS.map((t, i) => {
            const p = pointOnPath(t);
            const isAccent = i === Math.floor(BEAD_TS.length / 2);
            const r = isAccent ? 10 : 7;
            return (
              <motion.g
                key={i}
                initial={{ scale: 0.96 }}
                animate={{ scale: reduced ? 1 : [0.98, 1.02, 0.98] }}
                transition={{
                  duration: 3 + (i % 4) * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.12,
                }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={isAccent ? "url(#tt-accent)" : "url(#tt-bead)"}
                />
                {/* Specular highlight */}
                <circle
                  cx={p.x - r * 0.35}
                  cy={p.y - r * 0.4}
                  r={r * 0.28}
                  fill="#FFFFFF"
                  opacity="0.55"
                />
              </motion.g>
            );
          })}

          {/* Tassel — cap + fanned strands. Strengthened from the previous
              two threads to a five-strand fan with a clear terminal knot,
              so the composition unambiguously reads as prayer beads with a
              tassel rather than a decorative arc. */}
          <g>
            {/* Terminal knot below the accent bead */}
            <ellipse cx="170" cy="207" rx="4" ry="2.6" fill="#8a6a00" />
            {/* Five strands fanning downward */}
            <path d="M 166 209 L 163 232" stroke="url(#tt-string)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M 168 209 L 167 234" stroke="url(#tt-string)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M 170 209 L 171 236" stroke="url(#tt-string)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M 172 209 L 175 234" stroke="url(#tt-string)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M 174 209 L 179 231" stroke="url(#tt-string)" strokeWidth="1.4" strokeLinecap="round" />
            {/* Small gold accent at the top of the tassel */}
            <ellipse cx="170" cy="204" rx="5" ry="3" fill="url(#tt-accent)" />
          </g>

          {/* Continuation — two smaller beads fading off the top of the
              frame imply this is a segment of a full 33-bead strand rather
              than a closed decorative loop. */}
          <g opacity="0.55">
            <circle cx="76" cy="42" r="5" fill="url(#tt-bead)" />
            <circle cx="88" cy="30" r="4" fill="url(#tt-bead)" opacity="0.7" />
          </g>
        </motion.g>
      </svg>
    </div>
  );
}

// Open arc — starts upper-left, sweeps down through the center, ends at
// the bottom-right where the tassel hangs. Deliberately not a closed loop.
const STRAND_PATH =
  "M 60 60 C 30 110, 30 170, 90 190 S 150 210, 170 197";

// 12 bead positions along the strand. Placing an odd count would center
// the accent bead visually; we shift slightly with the midpoint index.
const BEAD_TS = [0.05, 0.14, 0.24, 0.34, 0.44, 0.5, 0.56, 0.66, 0.76, 0.86, 0.94];

/**
 * Point on the strand path at parameter t ∈ [0,1]. Cheap approximation:
 * evaluate the Bezier control polygon directly rather than call
 * `getPointAtLength` (which requires DOM access at render time).
 */
function pointOnPath(t: number): { x: number; y: number } {
  // The path is one M + two cubic segments. We hand-eval each segment.
  const seg1 = [
    { x: 60, y: 60 },
    { x: 30, y: 110 },
    { x: 30, y: 170 },
    { x: 90, y: 190 },
  ] as const;
  // The `S` shorthand reflects the previous control point around the anchor:
  // reflected = 2*anchor - prev_control  →  2*(90,190) - (30,170) = (150,210).
  const seg2 = [
    { x: 90, y: 190 },
    { x: 150, y: 210 },
    { x: 150, y: 210 },
    { x: 170, y: 197 },
  ] as const;
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const s = t < 0.5 ? seg1 : seg2;
  return bezier(s[0], s[1], s[2], s[3], local);
}

function bezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  };
}
