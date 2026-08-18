"use client";
import * as React from "react";
import { cloudRepositories, UnauthorizedError } from "@/lib/data/cloud/cloud-repositories";
import {
  readSnapshot,
  writeSnapshot,
  clearSnapshot,
  enqueueWrite,
  updateQueueEntry,
  dequeueWrite,
  listQueue,
  clearQueueForUser,
  type PendingWrite,
} from "@/lib/cache/local-cache";
import type {
  CreateEntryInput,
  CreateEntryResult,
  CreateTrackerInput,
  ProgressEntry,
  Tracker,
  UpdateEntryInput,
  UpdateTrackerInput,
} from "@/lib/data/types";
import { useAuth } from "@/components/auth/auth-context";
import { todayKey } from "@/lib/date-utils";

type SyncState = "idle" | "syncing" | "offline" | "error";

interface DataContextValue {
  trackers: Tracker[];
  entries: ProgressEntry[];
  loading: boolean;
  sync: SyncState;
  pendingCount: number;
  createTracker: (input: CreateTrackerInput) => Promise<Tracker>;
  updateTracker: (id: string, patch: UpdateTrackerInput) => Promise<Tracker>;
  deleteTracker: (id: string) => Promise<void>;
  reorderTrackers: (ids: string[]) => Promise<void>;
  addEntry: (input: CreateEntryInput) => Promise<CreateEntryResult>;
  updateEntry: (id: string, patch: UpdateEntryInput) => Promise<ProgressEntry>;
  deleteEntry: (id: string) => Promise<void>;
  reload: (options?: { force?: boolean }) => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

const MAX_QUEUE_ATTEMPTS = 5;

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function isNetworkError(err: unknown): boolean {
  const msg = ((err as Error)?.message ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("fetch failed") ||
    msg.includes("load failed")
  );
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session, service } = useAuth();
  const userId = session?.user.id;
  const [trackers, setTrackers] = React.useState<Tracker[]>([]);
  const [entries, setEntries] = React.useState<ProgressEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sync, setSync] = React.useState<SyncState>("idle");
  const [pendingCount, setPendingCount] = React.useState(0);
  const flushingRef = React.useRef(false);
  const reloadInFlightRef = React.useRef<Promise<void> | null>(null);
  const lastReloadAtRef = React.useRef(0);
  const previousUserRef = React.useRef<string | null>(null);

  // Reset in-memory state whenever the active user changes and purge the
  // outgoing account's cached snapshot so nothing lingers across sessions.
  React.useEffect(() => {
    const previous = previousUserRef.current;
    if (previous && previous !== userId) {
      void clearSnapshot(previous).catch(() => undefined);
      void clearQueueForUser(previous).catch(() => undefined);
      setTrackers([]);
      setEntries([]);
      setPendingCount(0);
    }
    previousUserRef.current = userId ?? null;
  }, [userId]);

  const applySnapshot = React.useCallback((t: Tracker[], e: ProgressEntry[]) => {
    setTrackers(t);
    setEntries(e);
  }, []);

  const refreshPending = React.useCallback(async () => {
    if (!userId) {
      setPendingCount(0);
      return;
    }
    const q = await listQueue(userId).catch(() => []);
    setPendingCount(q.length);
  }, [userId]);

  // Coalesced reload: at most one in-flight request; a rapid second call
  // reuses the running promise. A throttle skips redundant calls that come
  // within RELOAD_THROTTLE_MS of the last successful reload — this stops
  // visibilitychange + online + mount + mutation-followups from producing
  // a storm of identical Server Action calls.
  const RELOAD_THROTTLE_MS = 2000;
  const reload = React.useCallback(
    async (options?: { force?: boolean }): Promise<void> => {
      if (!userId) {
        setTrackers([]);
        setEntries([]);
        setLoading(false);
        return;
      }
      if (reloadInFlightRef.current) return reloadInFlightRef.current;
      if (!options?.force && Date.now() - lastReloadAtRef.current < RELOAD_THROTTLE_MS) return;
      if (!isOnline()) {
        setSync("offline");
        setLoading(false);
        return;
      }
      setSync("syncing");
      const run = (async () => {
        try {
          const snap = await cloudRepositories.list();
          applySnapshot(snap.trackers, snap.entries);
          lastReloadAtRef.current = Date.now();
          await writeSnapshot({
            userId,
            trackers: snap.trackers,
            entries: snap.entries,
            cachedAt: new Date().toISOString(),
          });
          setSync(isOnline() ? "idle" : "offline");
        } catch (err) {
          if (err instanceof UnauthorizedError) {
            await service.signOut().catch(() => undefined);
            return;
          }
          console.warn("sync failed", err);
          setSync(isOnline() ? "error" : "offline");
        } finally {
          setLoading(false);
        }
      })();
      reloadInFlightRef.current = run;
      try {
        await run;
      } finally {
        reloadInFlightRef.current = null;
      }
    },
    [userId, applySnapshot, service],
  );

  const flushQueue = React.useCallback(async () => {
    if (!userId || !isOnline() || flushingRef.current) return;
    flushingRef.current = true;
    try {
      const pending = await listQueue(userId);
      for (const item of pending) {
        try {
          await cloudRepositories.createEntry({
            clientId: item.id,
            trackerId: item.trackerId,
            amount: item.amount,
            entryDate: item.entryDate,
            note: item.note,
          });
          await dequeueWrite(item.id);
        } catch (err) {
          if (err instanceof UnauthorizedError) {
            await service.signOut().catch(() => undefined);
            return;
          }
          const next: PendingWrite = { ...item, attempts: item.attempts + 1 };
          if (next.attempts >= MAX_QUEUE_ATTEMPTS) {
            // Give up on this entry — most likely the tracker was deleted
            // or the input is now invalid. Drop it rather than looping.
            await dequeueWrite(item.id);
          } else {
            await updateQueueEntry(next);
          }
          // Stop processing so we don't hammer the server on transient errors.
          break;
        }
      }
      await refreshPending();
      if (pending.length > 0) await reload({ force: true });
    } finally {
      flushingRef.current = false;
    }
  }, [userId, refreshPending, reload, service]);

  // Initial paint from cache, then fresh fetch and queue flush.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const cached = await readSnapshot(userId);
      if (!cancelled && cached) applySnapshot(cached.trackers, cached.entries);
      await refreshPending();
      await reload();
      if (cancelled) return;
      await flushQueue();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reload, applySnapshot, refreshPending, flushQueue]);

  // Refresh + flush on tab focus / network reconnection.
  React.useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && isOnline()) {
        void reload();
        void flushQueue();
      }
    };
    const onOnline = () => {
      setSync("syncing");
      void reload({ force: true });
      void flushQueue();
    };
    const onOffline = () => setSync("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [userId, reload, flushQueue]);

  const createTracker = React.useCallback(
    async (input: CreateTrackerInput) => {
      try {
        const t = await cloudRepositories.createTracker(input);
        setTrackers((prev) => [...prev, t]);
        return t;
      } catch (err) {
        if (err instanceof UnauthorizedError) await service.signOut().catch(() => undefined);
        throw err;
      }
    },
    [service],
  );

  const updateTracker = React.useCallback(
    async (id: string, patch: UpdateTrackerInput) => {
      try {
        const t = await cloudRepositories.updateTracker(id, patch);
        setTrackers((prev) => prev.map((x) => (x.id === id ? t : x)));
        return t;
      } catch (err) {
        if (err instanceof UnauthorizedError) await service.signOut().catch(() => undefined);
        throw err;
      }
    },
    [service],
  );

  const deleteTracker = React.useCallback(
    async (id: string) => {
      try {
        await cloudRepositories.deleteTracker(id);
        setTrackers((prev) => prev.filter((x) => x.id !== id));
        setEntries((prev) => prev.filter((x) => x.trackerId !== id));
      } catch (err) {
        if (err instanceof UnauthorizedError) await service.signOut().catch(() => undefined);
        throw err;
      }
    },
    [service],
  );

  const reorderTrackers = React.useCallback(async (ids: string[]) => {
    await cloudRepositories.reorderTrackers(ids);
    setTrackers((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      return ids
        .map((id, i) => {
          const t = map.get(id);
          return t ? { ...t, sortOrder: i } : null;
        })
        .filter((x): x is Tracker => x !== null);
    });
  }, []);

  const addEntry = React.useCallback(
    async (input: CreateEntryInput) => {
      if (!userId) throw new Error("Not signed in.");
      const now = new Date().toISOString();
      const id = input.clientId ?? newUuid();
      const optimistic: ProgressEntry = {
        id,
        userId,
        trackerId: input.trackerId,
        amount: Math.floor(input.amount),
        entryDate: input.entryDate ?? todayKey(),
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      setEntries((prev) => [optimistic, ...prev]);

      const enqueueLocal = async () => {
        await enqueueWrite({
          id,
          userId,
          trackerId: input.trackerId,
          amount: optimistic.amount,
          entryDate: optimistic.entryDate,
          note: optimistic.note,
          createdAt: now,
          attempts: 0,
        });
        await refreshPending();
      };

      if (!isOnline()) {
        await enqueueLocal();
        return { entry: optimistic, newMilestones: [], completed: false };
      }

      try {
        const result = await cloudRepositories.createEntry({ ...input, clientId: id });
        setEntries((prev) => prev.map((e) => (e.id === id ? result.entry : e)));
        return result;
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          setEntries((prev) => prev.filter((e) => e.id !== id));
          await service.signOut().catch(() => undefined);
          throw err;
        }
        if (isNetworkError(err)) {
          await enqueueLocal();
          return { entry: optimistic, newMilestones: [], completed: false };
        }
        setEntries((prev) => prev.filter((e) => e.id !== id));
        throw err;
      }
    },
    [userId, refreshPending, service],
  );

  const updateEntry = React.useCallback(
    async (id: string, patch: UpdateEntryInput) => {
      try {
        const e = await cloudRepositories.updateEntry(id, patch);
        setEntries((prev) => prev.map((x) => (x.id === id ? e : x)));
        return e;
      } catch (err) {
        if (err instanceof UnauthorizedError) await service.signOut().catch(() => undefined);
        throw err;
      }
    },
    [service],
  );

  const deleteEntry = React.useCallback(
    async (id: string) => {
      // Optimistic UI + also remove any pending queue item for the same id.
      setEntries((prev) => prev.filter((x) => x.id !== id));
      try {
        await dequeueWrite(id).catch(() => undefined);
        await cloudRepositories.deleteEntry(id);
        await refreshPending();
      } catch (err) {
        if (err instanceof UnauthorizedError) {
          await service.signOut().catch(() => undefined);
        }
        // Force a reload so the row we optimistically removed is restored.
        void reload({ force: true });
        throw err;
      }
    },
    [refreshPending, reload, service],
  );

  // Memoized to avoid producing a new context value on every render of the
  // provider — every subscriber would otherwise re-render on unrelated
  // state changes (e.g. a mutation-in-progress boolean).
  const value = React.useMemo<DataContextValue>(
    () => ({
      trackers,
      entries,
      loading,
      sync,
      pendingCount,
      createTracker,
      updateTracker,
      deleteTracker,
      reorderTrackers,
      addEntry,
      updateEntry,
      deleteEntry,
      reload,
    }),
    [
      trackers,
      entries,
      loading,
      sync,
      pendingCount,
      createTracker,
      updateTracker,
      deleteTracker,
      reorderTrackers,
      addEntry,
      updateEntry,
      deleteEntry,
      reload,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
