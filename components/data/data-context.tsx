"use client";
import * as React from "react";
import { cloudRepositories } from "@/lib/data/cloud/cloud-repositories";
import { readSnapshot, writeSnapshot, clearSnapshot } from "@/lib/cache/local-cache";
import type {
  CreateEntryInput,
  CreateTrackerInput,
  ProgressEntry,
  Tracker,
  UpdateEntryInput,
  UpdateTrackerInput,
} from "@/lib/data/types";
import { useAuth } from "@/components/auth/auth-context";

type SyncState = "idle" | "syncing" | "offline" | "error";

interface DataContextValue {
  trackers: Tracker[];
  entries: ProgressEntry[];
  loading: boolean;
  sync: SyncState;
  createTracker: (input: CreateTrackerInput) => Promise<Tracker>;
  updateTracker: (id: string, patch: UpdateTrackerInput) => Promise<Tracker>;
  deleteTracker: (id: string) => Promise<void>;
  reorderTrackers: (ids: string[]) => Promise<void>;
  addEntry: (input: CreateEntryInput) => Promise<ProgressEntry>;
  updateEntry: (id: string, patch: UpdateEntryInput) => Promise<ProgressEntry>;
  deleteEntry: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [trackers, setTrackers] = React.useState<Tracker[]>([]);
  const [entries, setEntries] = React.useState<ProgressEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sync, setSync] = React.useState<SyncState>("idle");

  const applySnapshot = React.useCallback(
    (t: Tracker[], e: ProgressEntry[]) => {
      setTrackers(t);
      setEntries(e);
    },
    [],
  );

  const reload = React.useCallback(async () => {
    if (!userId) {
      setTrackers([]);
      setEntries([]);
      setLoading(false);
      return;
    }
    setSync("syncing");
    try {
      const snap = await cloudRepositories.list();
      applySnapshot(snap.trackers, snap.entries);
      await writeSnapshot({
        userId,
        trackers: snap.trackers,
        entries: snap.entries,
        cachedAt: new Date().toISOString(),
      });
      setSync(navigator.onLine ? "idle" : "offline");
    } catch (err) {
      console.warn("sync failed", err);
      setSync(navigator.onLine ? "error" : "offline");
    } finally {
      setLoading(false);
    }
  }, [userId, applySnapshot]);

  // Initial: read cache first for instant paint, then fetch fresh.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const cached = await readSnapshot(userId);
      if (!cancelled && cached) {
        applySnapshot(cached.trackers, cached.entries);
      }
      await reload();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reload, applySnapshot]);

  // Refresh on tab focus and network reconnection.
  React.useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const onOnline = () => {
      setSync("syncing");
      void reload();
    };
    const onOffline = () => setSync("offline");
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [userId, reload]);

  const createTracker = React.useCallback(
    async (input: CreateTrackerInput) => {
      const t = await cloudRepositories.createTracker(input);
      setTrackers((prev) => [...prev, t]);
      void reload();
      return t;
    },
    [reload],
  );

  const updateTracker = React.useCallback(
    async (id: string, patch: UpdateTrackerInput) => {
      const t = await cloudRepositories.updateTracker(id, patch);
      setTrackers((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    [],
  );

  const deleteTracker = React.useCallback(async (id: string) => {
    await cloudRepositories.deleteTracker(id);
    setTrackers((prev) => prev.filter((x) => x.id !== id));
    setEntries((prev) => prev.filter((x) => x.trackerId !== id));
  }, []);

  const reorderTrackers = React.useCallback(
    async (ids: string[]) => {
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
    },
    [],
  );

  const addEntry = React.useCallback(
    async (input: CreateEntryInput) => {
      const e = await cloudRepositories.createEntry(input);
      setEntries((prev) => [e, ...prev]);
      // Trigger a background refresh so completion / milestones update.
      void reload();
      return e;
    },
    [reload],
  );

  const updateEntry = React.useCallback(
    async (id: string, patch: UpdateEntryInput) => {
      const e = await cloudRepositories.updateEntry(id, patch);
      setEntries((prev) => prev.map((x) => (x.id === id ? e : x)));
      return e;
    },
    [],
  );

  const deleteEntry = React.useCallback(async (id: string) => {
    await cloudRepositories.deleteEntry(id);
    setEntries((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Purge cache on sign-out.
  React.useEffect(() => {
    return () => {
      if (userId) void clearSnapshot(userId).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: DataContextValue = {
    trackers,
    entries,
    loading,
    sync,
    createTracker,
    updateTracker,
    deleteTracker,
    reorderTrackers,
    addEntry,
    updateEntry,
    deleteEntry,
    reload,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
