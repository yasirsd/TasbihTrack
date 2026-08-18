import type { ProgressEntry, Tracker, TrackerStatus } from "@/lib/data/types";
import type { JourneyEvent } from "@/lib/data/journey-types";

export interface TrackerRow {
  id: string;
  user_id: string;
  name: string;
  arabic_text: string | null;
  description: string | null;
  target_count: number;
  daily_target: number | null;
  target_date: string | null;
  status: TrackerStatus;
  is_pinned: boolean;
  sort_order: number;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EntryRow {
  id: string;
  user_id: string;
  tracker_id: string;
  amount: number;
  entry_date: string | Date;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventRow {
  id: string;
  user_id: string;
  tracker_id: string;
  event_type: JourneyEvent["type"];
  event_data: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

function toDateKey(v: string | Date): string {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // Postgres date arrives as "YYYY-MM-DD"
  return v.slice(0, 10);
}

export function trackerFromRow(row: TrackerRow): Tracker {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    arabicText: row.arabic_text ?? undefined,
    description: row.description ?? undefined,
    targetCount: Number(row.target_count),
    dailyTarget: row.daily_target !== null ? Number(row.daily_target) : undefined,
    targetDate: row.target_date ? toDateKey(row.target_date) : undefined,
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    sortOrder: Number(row.sort_order),
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function entryFromRow(row: EntryRow): ProgressEntry {
  return {
    id: row.id,
    userId: row.user_id,
    trackerId: row.tracker_id,
    amount: Number(row.amount),
    entryDate: toDateKey(row.entry_date),
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function eventFromRow(row: EventRow): JourneyEvent {
  return {
    id: row.id,
    trackerId: row.tracker_id,
    type: row.event_type,
    data: row.event_data ?? {},
    occurredAt: row.occurred_at,
  };
}
