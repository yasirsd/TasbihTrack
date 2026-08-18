export function toLocalDateKey(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toLocalDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey).getTime();
  const b = parseDateKey(toKey).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function daysUntil(targetIso: string | undefined | null): number | null {
  if (!targetIso) return null;
  const key = toLocalDateKey(targetIso);
  const today = todayKey();
  const diff = daysBetween(today, key);
  return diff;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day; // week starts on Sunday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function last7DaysKeys(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    out.push(toLocalDateKey(addDays(today, -i)));
  }
  return out;
}

export function formatRelativeDate(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";
  const yesterdayKey = toLocalDateKey(addDays(new Date(), -1));
  if (key === yesterdayKey) return "Yesterday";
  const d = parseDateKey(key);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatLongDate(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDay(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function shiftDayKey(key: string, delta: number): string {
  return toLocalDateKey(addDays(parseDateKey(key), delta));
}
