"use client";
import * as React from "react";
import { useAuth } from "@/components/auth/auth-context";
import {
  detectPhase1Data,
  invalidateDetectionCache,
  type LocalDataSummary,
} from "@/lib/migration/phase1-local";

interface MigrationContextValue {
  /** Detected Phase-1 data for the signed-in user, or null if none. */
  candidate: LocalDataSummary | null;
  /** Is the dialog currently visible? */
  open: boolean;
  /** Show the dialog again (used by the manual Profile entry point). */
  openDialog: () => void;
  /** Dismiss the dialog — persists per-user-per-session. */
  closeDialog: () => void;
  /** After successful import: clear candidate + dismiss for this session. */
  markImported: () => void;
}

const MigrationContext = React.createContext<MigrationContextValue | null>(null);

const DISMISS_KEY = (userId: string) => `tasbihtrack:migration-dismissed:${userId}`;

function readDismissed(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(userId: string, v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (v) window.sessionStorage.setItem(DISMISS_KEY(userId), "1");
    else window.sessionStorage.removeItem(DISMISS_KEY(userId));
  } catch {
    /* ignore */
  }
}

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const username = session?.user.username;
  const migrated = Boolean(
    (session?.user.preferences as { localMigrationCompletedAt?: string } | undefined)
      ?.localMigrationCompletedAt,
  );

  const [candidate, setCandidate] = React.useState<LocalDataSummary | null>(null);
  // `open` is deliberately independent of `candidate` — dismissing must not
  // depend on the candidate disappearing.
  const [open, setOpen] = React.useState(false);

  // Detection runs at authenticated-session start ONLY. It won't re-run on
  // context churn — the detectPhase1Data() helper caches per username.
  React.useEffect(() => {
    if (!username || migrated) {
      setCandidate(null);
      setOpen(false);
      return;
    }
    let cancelled = false;
    void detectPhase1Data(username).then((found) => {
      if (cancelled) return;
      setCandidate(found);
      if (found && userId && !readDismissed(userId)) {
        setOpen(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // We intentionally exclude `userId` — a change of user re-runs via the
    // `username` change (which comes from the same session). If username is
    // stable across renders (which it is), this effect stays quiet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, migrated]);

  // On account switch: forget the previous user's per-session dismissal so
  // the new account gets its own prompt.
  const previousUserRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const prev = previousUserRef.current;
    if (prev && prev !== userId) {
      invalidateDetectionCache();
      setCandidate(null);
      setOpen(false);
    }
    previousUserRef.current = userId ?? null;
  }, [userId]);

  const value = React.useMemo<MigrationContextValue>(
    () => ({
      candidate,
      open,
      openDialog: () => setOpen(true),
      closeDialog: () => {
        setOpen(false);
        if (userId) writeDismissed(userId, true);
      },
      markImported: () => {
        setOpen(false);
        setCandidate(null);
        if (userId) writeDismissed(userId, true);
        invalidateDetectionCache(username ?? undefined);
      },
    }),
    [candidate, open, userId, username],
  );

  return <MigrationContext.Provider value={value}>{children}</MigrationContext.Provider>;
}

export function useMigration(): MigrationContextValue {
  const ctx = React.useContext(MigrationContext);
  if (!ctx) throw new Error("useMigration must be used inside <MigrationProvider>");
  return ctx;
}
