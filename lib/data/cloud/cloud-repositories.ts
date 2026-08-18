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

export interface CloudSnapshot {
  trackers: Tracker[];
  entries: ProgressEntry[];
}

export const cloudRepositories = {
  async list(): Promise<CloudSnapshot> {
    return listTrackersAction();
  },
  async createTracker(input: CreateTrackerInput): Promise<Tracker> {
    return createTrackerAction(input);
  },
  async updateTracker(id: string, patch: UpdateTrackerInput): Promise<Tracker> {
    return updateTrackerAction({ ...patch, id });
  },
  async deleteTracker(id: string): Promise<void> {
    return deleteTrackerAction(id);
  },
  async reorderTrackers(ids: string[]): Promise<void> {
    return reorderTrackersAction(ids);
  },
  async createEntry(input: CreateEntryInput): Promise<ProgressEntry> {
    return createEntryAction(input);
  },
  async updateEntry(id: string, patch: UpdateEntryInput): Promise<ProgressEntry> {
    return updateEntryAction({ ...patch, id });
  },
  async deleteEntry(id: string): Promise<void> {
    return deleteEntryAction(id);
  },
  async trackerEvents(trackerId: string): Promise<JourneyEvent[]> {
    return trackerEventsAction(trackerId);
  },
};
