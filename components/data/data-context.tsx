"use client";
import * as React from "react";
import { getRepositories } from "@/lib/data/repositories";
import type {
  CreateEntryInput,
  CreateTrackerInput,
  ProgressEntry,
  Tracker,
  UpdateEntryInput,
  UpdateTrackerInput,
} from "@/lib/data/types";
import { useAuth } from "@/components/auth/auth-context";

interface DataContextValue {
  trackers: Tracker[];
  entries: ProgressEntry[];
  loading: boolean;
  createTracker: (input: CreateTrackerInput) => Promise<Tracker>;
  updateTracker: (id: string, patch: UpdateTrackerInput) => Promise<Tracker>;
  deleteTracker: (id: string) => Promise<void>;
  addEntry: (input: CreateEntryInput) => Promise<ProgressEntry>;
  updateEntry: (id: string, patch: UpdateEntryInput) => Promise<ProgressEntry>;
  deleteEntry: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [trackers, setTrackers] = React.useState<Tracker[]>([]);
  const [entries, setEntries] = React.useState<ProgressEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const repos = React.useMemo(() => getRepositories(), []);
  const userId = session?.user.id;

  const reload = React.useCallback(async () => {
    if (!userId) {
      setTrackers([]);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [t, e] = await Promise.all([
      repos.trackers.listForUser(userId),
      repos.entries.listForUser(userId),
    ]);
    setTrackers(t);
    setEntries(e);
    setLoading(false);
  }, [repos, userId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const createTracker = React.useCallback(
    async (input: CreateTrackerInput) => {
      if (!userId) throw new Error("Not signed in");
      const t = await repos.trackers.create(userId, input);
      setTrackers((prev) => [...prev, t].sort((a, b) => a.sortOrder - b.sortOrder));
      return t;
    },
    [repos, userId],
  );

  const updateTracker = React.useCallback(
    async (id: string, patch: UpdateTrackerInput) => {
      if (!userId) throw new Error("Not signed in");
      const t = await repos.trackers.update(userId, id, patch);
      setTrackers((prev) => prev.map((x) => (x.id === id ? t : x)));
      return t;
    },
    [repos, userId],
  );

  const deleteTracker = React.useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Not signed in");
      await repos.trackers.delete(userId, id);
      setTrackers((prev) => prev.filter((x) => x.id !== id));
      setEntries((prev) => prev.filter((x) => x.trackerId !== id));
    },
    [repos, userId],
  );

  const addEntry = React.useCallback(
    async (input: CreateEntryInput) => {
      if (!userId) throw new Error("Not signed in");
      const e = await repos.entries.create(userId, input);
      setEntries((prev) => [e, ...prev]);
      // Auto-mark completed if reached target
      const tracker = trackers.find((t) => t.id === input.trackerId);
      if (tracker && tracker.status === "active") {
        const total =
          entries.filter((x) => x.trackerId === tracker.id).reduce((a, b) => a + b.amount, 0) + e.amount;
        if (total >= tracker.targetCount && tracker.targetCount > 0) {
          const updated = await repos.trackers.update(userId, tracker.id, { status: "completed" });
          setTrackers((prev) => prev.map((x) => (x.id === tracker.id ? updated : x)));
        }
      }
      return e;
    },
    [repos, userId, trackers, entries],
  );

  const updateEntry = React.useCallback(
    async (id: string, patch: UpdateEntryInput) => {
      if (!userId) throw new Error("Not signed in");
      const e = await repos.entries.update(userId, id, patch);
      setEntries((prev) => prev.map((x) => (x.id === id ? e : x)));
      return e;
    },
    [repos, userId],
  );

  const deleteEntry = React.useCallback(
    async (id: string) => {
      if (!userId) throw new Error("Not signed in");
      await repos.entries.delete(userId, id);
      setEntries((prev) => prev.filter((x) => x.id !== id));
    },
    [repos, userId],
  );

  return (
    <DataContext.Provider
      value={{
        trackers,
        entries,
        loading,
        createTracker,
        updateTracker,
        deleteTracker,
        addEntry,
        updateEntry,
        deleteEntry,
        reload,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
