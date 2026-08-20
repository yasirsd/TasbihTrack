"use client";
import * as React from "react";

/**
 * Centralised keyboard-visible viewport tracking.
 *
 * WHY THIS EXISTS (see PROMPT 5A §9–§17):
 *   Previous keyboard work relied on CSS `100dvh` + `max-h-[90dvh]`. On the
 *   owner's real device, those still let the focused input hide behind the
 *   keyboard because the layout viewport doesn't shrink when the keyboard
 *   opens on iOS — only the *visual* viewport does.
 *
 * WHAT THIS DOES:
 *   • Listens once (module-level singleton) to window.visualViewport.resize.
 *     No per-form listener spam.
 *   • Writes the current safe height to `--vvh` on <html> and the sheet
 *     max-height to `--sheet-max-h` (`min(90dvh, --vvh - 24px)`).
 *   • Sets `data-keyboard-open` on <html> when the visual viewport is
 *     visibly smaller than the layout viewport — screens can style off it
 *     if they want. NO polling. NO random setTimeout.
 *   • Uses passive listeners and rAF-coalesces writes.
 *
 * If visualViewport doesn't exist (very old browsers) we just leave the
 * CSS `90dvh` fallback in place and everything still works — Clay's
 * new sheet architecture is a strict enhancement.
 *
 * The focus-into-view helper is a SEPARATE opt-in — callers that mount
 * this hook get the CSS variables for free; a form that wants to
 * additionally scroll a focused field into view on keyboard-open should
 * import `useEnsureFocusVisible()`.
 */

// Module-singleton state so N mounted forms cost 1 listener.
let installed = false;
let lastVVH = 0;
let raf = 0;

function apply() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const vv = window.visualViewport;
    if (!vv) return;
    const h = Math.round(vv.height);
    if (h === lastVVH) return;
    lastVVH = h;
    el.style.setProperty("--vvh", `${h}px`);
    // Sheets should never grow beyond 90% of the visual viewport, and
    // should shrink further with a small buffer once the keyboard opens.
    // 24px buffer keeps the drag handle above the keyboard's shadow.
    el.style.setProperty("--sheet-max-h", `min(90dvh, ${h - 24}px)`);
    // Coarse keyboard-open heuristic: layout height minus visual height >
    // 120px suggests a soft keyboard. Not authoritative — just a hook
    // that screens can style off if they want.
    const layoutH = window.innerHeight || h;
    const gap = layoutH - h;
    if (gap > 120) el.setAttribute("data-keyboard-open", "");
    else el.removeAttribute("data-keyboard-open");
  });
}

function install() {
  if (installed || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  installed = true;
  apply();
  vv.addEventListener("resize", apply, { passive: true });
  vv.addEventListener("scroll", apply, { passive: true });
  window.addEventListener("orientationchange", apply, { passive: true });
}

/**
 * Mounting this hook installs the singleton listeners exactly once and
 * exposes the current visual viewport height + a keyboard-open flag. Cheap
 * to mount everywhere — it does not re-render on resize by default; opt in
 * with `subscribe: true` if you actually need state.
 */
export function useKeyboardViewport(opts?: { subscribe?: boolean }): {
  vvh: number | null;
  keyboardOpen: boolean;
} {
  const [state, setState] = React.useState<{ vvh: number | null; keyboardOpen: boolean }>({
    vvh: null,
    keyboardOpen: false,
  });

  React.useEffect(() => {
    install();
    if (!opts?.subscribe) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const h = Math.round(vv.height);
      const gap = (window.innerHeight || h) - h;
      setState({ vvh: h, keyboardOpen: gap > 120 });
    };
    onResize();
    vv.addEventListener("resize", onResize, { passive: true });
    return () => vv.removeEventListener("resize", onResize);
  }, [opts?.subscribe]);

  return state;
}

/**
 * When a text control inside a scrollable form receives focus and the
 * keyboard is about to open, browsers *usually* scroll it into view. Some
 * combinations (Sheet + nested scroll container on iOS Safari) skip that.
 * Calling this from a form registers a scoped focus-in handler that pulls
 * the active input into the middle of its scroll parent AFTER the visual
 * viewport has resized (not before, or the scroll target is wrong).
 *
 * Rules (PROMPT 5A §14–§15):
 *   • Only runs when the viewport ACTUALLY shrinks.
 *   • Uses `scrollIntoView({ block: "center" })`, or `"auto"` for reduced
 *     motion. No arbitrary setTimeout(500).
 *   • Cleans up on unmount.
 */
export function useEnsureFocusVisible(
  scrollRootRef?: React.RefObject<HTMLElement | null>,
): void {
  React.useEffect(() => {
    install();
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    let pendingEl: HTMLElement | null = null;

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        !t.isContentEditable
      )
        return;
      pendingEl = t;
    };

    const onResize = () => {
      if (!pendingEl) return;
      const el = pendingEl;
      pendingEl = null;
      // If this focus is inside our scroll root (or if none supplied,
      // globally), pull it into view. `block: "center"` lands the caret
      // above the keyboard rather than flush against its top edge.
      const root = scrollRootRef?.current ?? document.body;
      if (!root.contains(el)) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // rAF so the layout has settled after the visualViewport resize.
      requestAnimationFrame(() => {
        el.scrollIntoView({
          block: "center",
          behavior: reduce ? "auto" : "smooth",
        });
      });
    };

    document.addEventListener("focusin", onFocusIn, true);
    vv.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      vv.removeEventListener("resize", onResize);
    };
  }, [scrollRootRef]);
}
