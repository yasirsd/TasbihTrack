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
import { useAppearance } from "@/components/appearance/appearance-provider";
import { confettiPaletteFor } from "@/lib/appearance/confetti-palettes";
import { useAuth } from "@/components/auth/auth-context";
import { UserAvatar } from "@/components/avatar/user-avatar";
import { isV3Config } from "@/lib/avatar/config-v3";

/**
 * The single celebration surface for milestone crossings (25/50/75) and
 * final completion. Dynamically imports `canvas-confetti` so no confetti
 * code lives in the initial bundle.
 *
 * The confetti PALETTE comes from `confettiPaletteFor(appearance.colorTheme)`
 * — see lib/appearance/confetti-palettes.ts for why CSS variables cannot
 * be passed directly to canvas-confetti (its worker doesn't have DOM).
 *
 * Respects `prefers-reduced-motion`: skips confetti but still shows the
 * static celebration surface so the message never depends on animation.
 */
/**
 * Map milestone kind → dapvatar posture key that best expresses the
 * moment. These keys match dapvatar 0.1.4's actual posture slugs
 * (verified at integration time). If the user's character doesn't
 * support a key, <UserAvatar> falls back to the stored expression —
 * we never crash. The stored config is NEVER mutated by this override.
 */
function contextualPostureKey(kind: CelebrationKind | null): string | undefined {
  if (kind === 25) return "star-eye";
  if (kind === 50) return "heart-eye";
  if (kind === 75) return "party";
  if (kind === "completed") return "mind-blowing";
  return undefined;
}

export function MilestoneCelebration() {
  const { request, dismiss } = useCelebration();
  const router = useRouter();
  const { appearance } = useAppearance();
  const { session } = useAuth();
  const kind = request?.kind ?? null;
  const palette = confettiPaletteFor(appearance.colorTheme);
  const userAvatar = session?.user.profile?.avatar ?? null;
  const showAvatarReaction = isV3Config(userAvatar);
  const reactionKey = contextualPostureKey(kind);

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

        const isCompletion = request.kind === "completed";
        const colors = isCompletion ? palette.completed : palette.milestone;
        const bursts = isCompletion ? 3 : 1;
        for (let i = 0; i < bursts; i++) {
          timers.push(
            setTimeout(() => {
              if (cancelled || !confettiInstance) return;
              confettiInstance({
                particleCount: isCompletion ? 90 : 60,
                spread: 70,
                startVelocity: 42,
                gravity: 0.9,
                ticks: 200,
                origin: { x: 0.5, y: 0.35 },
                colors,
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
    // palette identity changes ONLY when the color theme changes; we
    // intentionally re-run this effect on that change too so a mid-celebration
    // palette swap is applied — but see: `request` object identity itself
    // rotates per-celebration so this is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {showAvatarReaction ? (
            /* Display-only avatar override — the saved config is never mutated. */
            <div className="clay-card mx-auto mb-1 grid place-items-center rounded-full bg-card p-1.5">
              <UserAvatar
                config={userAvatar}
                expressionOverride={reactionKey}
                size={isCompletion ? 96 : 80}
                alt=""
                ariaHidden
                className="rounded-full"
              />
            </div>
          ) : (
            <div
              className="mx-auto mb-1 grid place-items-center rounded-full text-white shadow-[0_10px_30px_-12px_hsl(var(--brand-1)/0.55)]"
              style={{
                height: isCompletion ? 72 : 56,
                width: isCompletion ? 72 : 56,
                background:
                  "linear-gradient(135deg, hsl(var(--brand-gold)) 0%, hsl(var(--brand-1)) 50%, hsl(var(--brand-2)) 100%)",
              }}
            >
              <Sparkles className={isCompletion ? "h-8 w-8" : "h-6 w-6"} aria-hidden />
            </div>
          )}
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
          <p className="mt-1 text-xs font-medium text-[hsl(var(--brand-1))]">{percentText} complete</p>
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
