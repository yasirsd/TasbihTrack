"use client";
import {
  createTrackerAction,
  deleteTrackerAction,
  listTrackersAction,
  reorderTrackersAction,
  trackerEventsAction,
  updateTrackerAction,
} from "@/lib/server/actions/tracker-actions";
import {
  createEntryAction,
  deleteEntryAction,
  updateEntryAction,
} from "@/lib/server/actions/entry-actions";
import type {
  CreateEntryInput,
  CreateTrackerInput,
  ProgressEntry,
  Tracker,
  UpdateEntryInput,
  UpdateTrackerInput,
} from "@/lib/data/types";
import type { JourneyEvent } from "@/lib/data/journey-types";

export class UnauthorizedError extends Error {
  code = "unauthorized" as const;
}

/**
 * Wrap a server-action call so a missing/expired session surfaces as a
 * typed error the client can act on (redirect to auth).
 */
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (/Not signed in|unauthorized/i.test(msg)) throw new UnauthorizedError(msg);
    throw err;
  }
}

export interface CloudSnapshot {
  trackers: Tracker[];
  entries: ProgressEntry[];
}

export const cloudRepositories = {
  async list(): Promise<CloudSnapshot> {
    return guarded(() => listTrackersAction());
  },
  async createTracker(input: CreateTrackerInput): Promise<Tracker> {
    return guarded(() => createTrackerAction(input));
  },
  async updateTracker(id: string, patch: UpdateTrackerInput): Promise<Tracker> {
    return guarded(() => updateTrackerAction({ ...patch, id }));
  },
  async deleteTracker(id: string): Promise<void> {
    return guarded(() => deleteTrackerAction(id));
  },
  async reorderTrackers(ids: string[]): Promise<void> {
    return guarded(() => reorderTrackersAction(ids));
  },
  async createEntry(input: CreateEntryInput): Promise<ProgressEntry> {
    return guarded(() => createEntryAction(input));
  },
  async updateEntry(id: string, patch: UpdateEntryInput): Promise<ProgressEntry> {
    return guarded(() => updateEntryAction({ ...patch, id }));
  },
  async deleteEntry(id: string): Promise<void> {
    return guarded(() => deleteEntryAction(id));
  },
  async trackerEvents(trackerId: string): Promise<JourneyEvent[]> {
    return guarded(() => trackerEventsAction(trackerId));
  },
};
