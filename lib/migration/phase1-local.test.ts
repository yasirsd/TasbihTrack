import { describe, expect, it } from "vitest";
import { __test__ } from "./phase1-local";

const { sanitizePayload } = __test__;

describe("sanitizePayload — Server-Action-safe payload normalization", () => {
  it("turns undefined optional fields into explicit null", () => {
    const out = sanitizePayload({
      usernameNormalized: "yasir",
      trackers: [
        {
          externalId: "t1",
          name: "Darood",
          arabicText: undefined,
          description: "Job k waaste",
          targetCount: 100000,
          targetDate: "2026-08-27",
          status: "active",
          sortOrder: 0,
          startedAt: "2026-08-18T18:59:59.999Z",
          completedAt: undefined,
        },
      ],
      entries: [],
    });
    const t = out.trackers[0];
    expect(t.arabicText).toBeNull();
    expect(t.completedAt).toBeNull();
    expect(t.description).toBe("Job k waaste");
    expect(t.targetDate).toBe("2026-08-27");
    expect(t.startedAt).toBe("2026-08-18T18:59:59.999Z");
    expect(t.sortOrder).toBe(0);
    expect(out.entries).toEqual([]);
  });

  it("keeps zero-entry trackers importable (no accidental filtering)", () => {
    const out = sanitizePayload({
      usernameNormalized: "u",
      trackers: [
        {
          externalId: "t1",
          name: "T",
          targetCount: 100,
          status: "active",
          sortOrder: 0,
          startedAt: "2026-08-18T00:00:00.000Z",
        } as never,
      ],
      entries: [],
    });
    expect(out.trackers).toHaveLength(1);
    expect(out.entries).toHaveLength(0);
  });

  it("preserves entry notes and maps trackerExternalId", () => {
    const out = sanitizePayload({
      usernameNormalized: "u",
      trackers: [],
      entries: [
        {
          trackerExternalId: "t1",
          amount: 1000,
          entryDate: "2026-08-19",
          note: undefined,
          createdAt: undefined,
        },
      ],
    });
    expect(out.entries[0].note).toBeNull();
    expect(out.entries[0].createdAt).toBeNull();
    expect(out.entries[0].trackerExternalId).toBe("t1");
  });
});
