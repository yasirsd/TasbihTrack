import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, backupPayloadSchema } from "./backup-schema";

// The import path in Restore Backup deserializes untrusted JSON from a
// user-selected file. These tests pin down exactly what shapes survive
// server-side validation so nothing arbitrary can be persisted.

function validPayload() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    trackers: [
      {
        externalId: "11111111-1111-1111-1111-111111111111",
        name: "Durood Shareef",
        targetCount: 100_000,
        status: "active" as const,
      },
    ],
    entries: [
      {
        trackerExternalId: "11111111-1111-1111-1111-111111111111",
        amount: 100,
        entryDate: "2026-08-19",
      },
    ],
  };
}

describe("backupPayloadSchema", () => {
  it("accepts a minimal well-formed payload", () => {
    expect(backupPayloadSchema.safeParse(validPayload()).success).toBe(true);
  });

  it("rejects an unknown version — old backups cannot pretend to be current", () => {
    const bad = { ...validPayload(), version: 1 };
    expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects negative and zero tracker targets", () => {
    for (const bad of [0, -1, -1_000_000]) {
      const p = validPayload();
      p.trackers[0].targetCount = bad;
      expect(backupPayloadSchema.safeParse(p).success).toBe(false);
    }
  });

  it("rejects non-integer tracker targets", () => {
    const p = validPayload();
    p.trackers[0].targetCount = 1.5;
    expect(backupPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("rejects unknown tracker status", () => {
    const p = validPayload();
    (p.trackers[0] as { status: string }).status = "deleted";
    expect(backupPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("rejects empty tracker name", () => {
    const p = validPayload();
    p.trackers[0].name = "";
    expect(backupPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("rejects ridiculously long tracker name (payload-abuse guard)", () => {
    const p = validPayload();
    p.trackers[0].name = "x".repeat(1024);
    expect(backupPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("rejects negative / zero / non-integer entry amounts", () => {
    for (const bad of [0, -1, 1.5]) {
      const p = validPayload();
      p.entries[0].amount = bad;
      expect(backupPayloadSchema.safeParse(p).success).toBe(false);
    }
  });

  it("rejects entries missing trackerExternalId", () => {
    const p = validPayload();
    (p.entries[0] as { trackerExternalId?: string }).trackerExternalId = undefined;
    expect(backupPayloadSchema.safeParse(p).success).toBe(false);
  });

  it("rejects a top-level array (garbage input)", () => {
    expect(backupPayloadSchema.safeParse([]).success).toBe(false);
  });

  it("rejects null / undefined / primitive at the top level", () => {
    for (const bad of [null, undefined, 0, "", true]) {
      expect(backupPayloadSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("strips unknown fields rather than rejecting the whole payload", () => {
    // Zod strips unknown keys by default — good, this means adding new
    // optional fields in a later version won't break older importers, and
    // arbitrary extra JSON in a hand-crafted backup can't sneak past into
    // the DB layer.
    const p = validPayload() as unknown as Record<string, unknown>;
    p.attackerControlledField = "sql-injection-attempt';--";
    const parsed = backupPayloadSchema.safeParse(p);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).attackerControlledField).toBeUndefined();
    }
  });
});
