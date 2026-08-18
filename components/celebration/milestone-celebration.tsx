"use client";
import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useCelebration, type CelebrationKind } from "./celebration-context";
import { useRouter } from "next/navigation";

// TasbihTrack palette — brand-controlled confetti colors.
const CRIMSON = "#EF233C";
const CRIMSON_SOFT = "#F45A6E";
const GOLD = "#FDC500";
const GOLD_SOFT = "#FFD84A";
const WHITE = "#FFFAF0";

/**
 * The single celebration surface for milestone crossings (25/50/75) and
 * final completion. Renders exactly once per mutation that crosses a
 * milestone — see CelebrationProvider — and dynamically imports
 * `canvas-confetti` so no confetti code lives in the initial bundle.
 *
 * Respects `prefers-reduced-motion`: skips confetti but still shows the
 * static celebration surface so the message never depends on animation.
 */
export function MilestoneCelebration() {
  const { request, dismiss } = useCelebration();
  const router = useRouter();
  const kind = request?.kind ?? null;

  React.useEffect(() => {
    if (!request) return;
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let canvas: HTMLCanvasElement | null = null;
    let confettiInstance: ((opts: object) => void) | null = null;
    let resetFn: (() => void) | null = null;

    (async () => {
      try {
        // Own the canvas explicitly rather than let canvas-confetti append
        // to <body>. This lets us guarantee fixed positioning, no scrollbar
        // impact, pointer-events:none, and a hard removal on cleanup.
        canvas = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.inset = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100dvh";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "9999";
        canvas.setAttribute("aria-hidden", "true");
        document.body.appendChild(canvas);

        const mod = await import("canvas-confetti");
        if (cancelled) return;
        confettiInstance = mod.default.create(canvas, {
          resize: true,
          useWorker: true,
          disableForReducedMotion: true,
        });
        resetFn = () => (mod.default as unknown as { reset?: () => void }).reset?.();

        const bursts = request.kind === "completed" ? 3 : 1;
        for (let i = 0; i < bursts; i++) {
          timers.push(
            setTimeout(() => {
              if (cancelled || !confettiInstance) return;
              confettiInstance({
                particleCount: request.kind === "completed" ? 90 : 60,
                spread: 70,
                startVelocity: 42,
                gravity: 0.9,
                ticks: 200,
                origin: { x: 0.5, y: 0.35 },
                colors:
                  request.kind === "completed"
                    ? [GOLD, GOLD_SOFT, CRIMSON, CRIMSON_SOFT, WHITE]
                    : [CRIMSON, CRIMSON_SOFT, GOLD],
                disableForReducedMotion: true,
              });
            }, i * 350),
          );
        }
      } catch {
        /* confetti is a nice-to-have; failing to load must not block UI */
      }
    })();

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
      try {
        resetFn?.();
      } catch {
        /* ignore */
      }
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvas = null;
      confettiInstance = null;
      resetFn = null;
    };
  }, [request]);

  if (!request) return null;

  const isCompletion = kind === "completed";
  const title = titleFor(kind);
  const target = request.tracker.targetCount;
  const percentText = isCompletion ? "100%" : `${kind}%`;

  return (
    <Dialog open onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-1 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-gold via-crimson to-crimson-deep text-white shadow-[0_10px_30px_-12px_hsl(354_88%_54%/0.55)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <DialogTitle className="text-center text-2xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">{descriptionFor(kind)}</DialogDescription>
        </DialogHeader>

        <div className="my-2 text-center">
          <p className="text-sm text-muted-foreground">{request.tracker.name}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {formatNumber(request.completed)}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              of {formatNumber(target)}
            </span>
          </p>
          <p className="mt-1 text-xs font-medium text-crimson">{percentText} complete</p>
        </div>

        <DialogFooter className="sm:justify-center">
          {isCompletion ? (
            <>
              <Button
                variant="crimson"
                onClick={() => {
                  dismiss();
                  router.push(`/app/tracker/${request.tracker.id}`);
                }}
              >
                View Journey
              </Button>
              <Button variant="outline" onClick={dismiss}>
                Continue tracking
              </Button>
            </>
          ) : (
            <Button variant="crimson" onClick={dismiss}>
              Continue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function titleFor(kind: CelebrationKind | null): string {
  if (kind === "completed") return "Alhamdulillah";
  return "MashaAllah";
}

function descriptionFor(kind: CelebrationKind | null): string {
  switch (kind) {
    case 25:
      return "You're making wonderful progress. Keep going.";
    case 50:
      return "You've completed half your journey. Keep going.";
    case 75:
      return "You're very close to your goal. Keep going toward your intention.";
    case "completed":
      return "You completed your intention.";
    default:
      return "";
  }
}
