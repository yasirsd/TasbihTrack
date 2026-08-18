export type JourneyEventType =
  | "tracker_created"
  | "starting_progress"
  | "milestone_reached"
  | "target_changed"
  | "daily_target_changed"
  | "paused"
  | "resumed"
  | "completed"
  | "reopened"
  | "archived"
  | "restored"
  | "note";

export interface JourneyEvent {
  id: string;
  trackerId: string;
  type: JourneyEventType;
  data: Record<string, unknown>;
  occurredAt: string;
}
