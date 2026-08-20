"use client";
import { useKeyboardViewport } from "@/lib/keyboard/use-keyboard-viewport";

/**
 * Mount once (in AppProviders) so the visualViewport listener installs at
 * app boot rather than lazily on the first form open. That way the very
 * first Sheet a user opens already has --sheet-max-h correctly set.
 *
 * No render output; no state subscription; effectively free.
 */
export function KeyboardScope() {
  useKeyboardViewport();
  return null;
}
