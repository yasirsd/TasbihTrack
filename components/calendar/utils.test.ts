import { describe, expect, it } from "vitest";
import type { ProgressEntry } from "@/lib/data/types";
import { buildActivityMap, intensityFor, parseLocalDateKey } from "./utils";

function e(
  amount: number,
  entryDate: string,
  trackerId = "t1",
  id = Math.random().toString(),
): ProgressEntry {
  return {
    id,
    userId: "u",
    trackerId,
    amount,
    entryDate,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };
}

describe("buildActivityMap", () => {
  it("aggregates multiple entries on the same date", () => {
    const map = buildActivityMap([
      e(500, "2026-08-18"),
      e(1000, "2026-08-18"),
      e(500, "2026-08-18"),
    ]);
    const day = map.get("2026-08-18");
    expect(day?.total).toBe(2000);
    expect(day?.entryCount).toBe(3);
    expect(day?.trackerCount).toBe(1);
  });

  it("counts distinct trackers per day", () => {
    const map = buildActivityMap([
      e(500, "2026-08-18", "t1"),
      e(500, "2026-08-18", "t2"),
      e(500, "2026-08-18", "t1"),
    ]);
    expect(map.get("2026-08-18")?.trackerCount).toBe(2);
    expect(map.get("2026-08-18")?.entryCount).toBe(3);
  });

  it("returns empty map for empty input", () => {
    expect(buildActivityMap([]).size).toBe(0);
  });

  it("keeps zero-amount days out (there should not be any)", () => {
    const map = buildActivityMap([e(1000, "2026-08-19")]);
    expect(map.get("2026-08-18")).toBeUndefined();
  });

  it("bucketizes intensity relative to the max in the given entries", () => {
    const map = buildActivityMap([
      e(100, "2026-08-01"), // low relative to 1000 → r=0.1 → low
      e(500, "2026-08-02"), // r=0.5 → medium
      e(1000, "2026-08-03"), // r=1 → high
    ]);
    expect(map.get("2026-08-01")?.intensity).toBe("low");
    expect(map.get("2026-08-02")?.intensity).toBe("medium");
    expect(map.get("2026-08-03")?.intensity).toBe("high");
  });
});

describe("intensityFor", () => {
  it("returns none for zero or non-positive max", () => {
    expect(intensityFor(0, 100)).toBe("none");
    expect(intensityFor(100, 0)).toBe("none");
  });
  it("bucket boundaries: ≤33% low, ≤66% medium, >66% high", () => {
    expect(intensityFor(33, 100)).toBe("low");
    expect(intensityFor(34, 100)).toBe("medium");
    expect(intensityFor(66, 100)).toBe("medium");
    expect(intensityFor(67, 100)).toBe("high");
  });
});

describe("parseLocalDateKey", () => {
  it("parses YYYY-MM-DD as local midnight without UTC shift", () => {
    const d = parseLocalDateKey("2026-08-18");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August (0-indexed)
    expect(d.getDate()).toBe(18);
    expect(d.getHours()).toBe(0);
  });
});
