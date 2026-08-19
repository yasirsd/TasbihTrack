import { describe, expect, it } from "vitest";
import { targetToWords, formatWithGrouping } from "./number-words";

describe("targetToWords — happy path", () => {
  it("1", () => {
    expect(targetToWords("1")?.words).toBe("One");
  });
  it("10", () => {
    expect(targetToWords("10")?.words).toBe("Ten");
  });
  it("100", () => {
    expect(targetToWords("100")?.words).toBe("One hundred");
  });
  it("1000", () => {
    expect(targetToWords("1000")?.words).toBe("One thousand");
  });
  it("10000", () => {
    expect(targetToWords("10000")?.words).toBe("Ten thousand");
  });
  it("100000", () => {
    expect(targetToWords("100000")?.words).toBe("One hundred thousand");
  });
  it("1000000", () => {
    expect(targetToWords("1000000")?.words).toBe("One million");
  });
  it("mixed compound: 21", () => {
    expect(targetToWords("21")?.words).toBe("Twenty-one");
  });
  it("mixed compound: 999999", () => {
    expect(targetToWords("999999")?.words).toBe(
      "Nine hundred ninety-nine thousand nine hundred ninety-nine",
    );
  });
});

describe("targetToWords — safety (§58)", () => {
  it("rejects empty", () => {
    expect(targetToWords("")).toBeNull();
  });
  it("rejects negative", () => {
    expect(targetToWords("-1")).toBeNull();
  });
  it("rejects decimals", () => {
    expect(targetToWords("1.5")).toBeNull();
  });
  it("rejects exponential", () => {
    expect(targetToWords("1e6")).toBeNull();
  });
  it("rejects formatted (with commas)", () => {
    expect(targetToWords("1,000")).toBeNull();
  });
  it("rejects Infinity", () => {
    expect(targetToWords(Infinity)).toBeNull();
  });
  it("rejects NaN", () => {
    expect(targetToWords(NaN)).toBeNull();
  });
  it("rejects unsafe integer above 10^15", () => {
    expect(targetToWords("1000000000000000")).toBeNull();
  });
});

describe("formatWithGrouping", () => {
  it("groups thousands", () => {
    expect(formatWithGrouping(100000)).toBe("100,000");
    expect(formatWithGrouping(1234567)).toBe("1,234,567");
  });
});
