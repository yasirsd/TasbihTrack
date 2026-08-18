"use client";
import * as React from "react";
import type { Tracker } from "@/lib/data/types";

export type CelebrationKind = 25 | 50 | 75 | "completed";

export interface CelebrationRequest {
  kind: CelebrationKind;
  tracker: Tracker;
  completed: number;
}

interface CelebrationContextValue {
  celebrate: (req: CelebrationRequest) => void;
  request: CelebrationRequest | null;
  dismiss: () => void;
}

const CelebrationContext = React.createContext<CelebrationContextValue | null>(null);

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<CelebrationRequest | null>(null);
  const value = React.useMemo<CelebrationContextValue>(
    () => ({
      celebrate: setRequest,
      request,
      dismiss: () => setRequest(null),
    }),
    [request],
  );
  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}

export function useCelebration(): CelebrationContextValue {
  const ctx = React.useContext(CelebrationContext);
  if (!ctx) throw new Error("useCelebration must be used inside <CelebrationProvider>");
  return ctx;
}

/**
 * Picks the single celebration to show for a mutation that crossed one or
 * more milestones (and possibly reached completion). Completion always wins;
 * otherwise the highest milestone reached wins. Returns null when nothing
 * should be shown.
 */
export function pickCelebration(
  newMilestones: number[],
  completed: boolean,
): CelebrationKind | null {
  if (completed) return "completed";
  const celebrationEligible = newMilestones.filter((m) => m === 25 || m === 50 || m === 75);
  if (celebrationEligible.length === 0) return null;
  const highest = Math.max(...celebrationEligible) as 25 | 50 | 75;
  return highest;
}
