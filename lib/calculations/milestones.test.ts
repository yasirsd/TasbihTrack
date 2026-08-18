import { describe, expect, it } from "vitest";
import { crossedMilestones } from "./milestones";

describe("crossedMilestones", () => {
  it("returns nothing when total does not increase", () => {
    expect(crossedMilestones(500, 500, 1000)).toEqual([]);
  });

  it("returns the threshold when crossing 50%", () => {
    expect(crossedMilestones(400, 600, 1000)).toEqual([50]);
  });

  it("returns multiple thresholds crossed in a single addition", () => {
    expect(crossedMilestones(0, 750, 1000)).toEqual([10, 25, 50, 75]);
  });

  it("includes 100 when target is reached exactly", () => {
    expect(crossedMilestones(0, 1000, 1000)).toEqual([10, 25, 50, 75, 90, 100]);
  });

  it("does not repeat a threshold already crossed", () => {
    expect(crossedMilestones(600, 700, 1000)).toEqual([]);
  });

  it("returns [] when target is zero", () => {
    expect(crossedMilestones(0, 100, 0)).toEqual([]);
  });
});
