import { describe, expect, it } from "vitest";
import { pickCelebration } from "./celebration-context";

describe("pickCelebration — one-time triggering policy", () => {
  it("completion beats any milestone", () => {
    expect(pickCelebration([25, 50, 75], true)).toBe("completed");
    expect(pickCelebration([], true)).toBe("completed");
  });

  it("returns highest milestone in the set for a single mutation", () => {
    expect(pickCelebration([25, 50], false)).toBe(50);
    expect(pickCelebration([50, 75], false)).toBe(75);
    expect(pickCelebration([25, 50, 75], false)).toBe(75);
  });

  it("returns null when no eligible milestones", () => {
    expect(pickCelebration([], false)).toBeNull();
    // 10% and 90% are Journey events but not eligible for celebration.
    expect(pickCelebration([10], false)).toBeNull();
    expect(pickCelebration([10, 90], false)).toBeNull();
  });

  it("returns 25 for a single 25 crossing", () => {
    expect(pickCelebration([25], false)).toBe(25);
  });
});
