import "server-only";
import type { PoolClient } from "pg";

export async function markCompleted(
  client: PoolClient,
  userId: string,
  trackerId: string,
  totalAtTime: number,
): Promise<void> {
  const row = await client.query<{ status: string }>(
    `select status from trackers where id = $1 for update`,
    [trackerId],
  );
  if (row.rows[0]?.status === "completed") return;
  await client.query(
    `update trackers set status = 'completed', completed_at = now()
       where id = $1 and user_id = $2`,
    [trackerId, userId],
  );
  await client.query(
    `insert into tracker_events (user_id, tracker_id, event_type, event_data)
     values ($1, $2, 'completed', $3::jsonb)`,
    [userId, trackerId, JSON.stringify({ totalAtTime })],
  );
}

export function todayLocalKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
