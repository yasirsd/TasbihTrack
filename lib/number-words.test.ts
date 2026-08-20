import { describe, expect, it } from "vitest";
import { formatIndianDigits, formatWithGrouping, targetToWords } from "./number-words";

describe("formatIndianDigits — Indian numbering grouping", () => {
  it("passes through short values unchanged", () => {
    expect(formatIndianDigits("")).toBe("");
    expect(formatIndianDigits("1")).toBe("1");
    expect(formatIndianDigits("42")).toBe("42");
    expect(formatIndianDigits("999")).toBe("999");
  });
  it("groups 4–5 digit values as thousand", () => {
    expect(formatIndianDigits("1000")).toBe("1,000");
    expect(formatIndianDigits("10000")).toBe("10,000");
    expect(formatIndianDigits("99999")).toBe("99,999");
  });
  it("groups lakh with a pair before the thousand triplet", () => {
    expect(formatIndianDigits("100000")).toBe("1,00,000");
    expect(formatIndianDigits("999999")).toBe("9,99,999");
  });
  it("groups ten-lakh values as XX,XX,XXX", () => {
    expect(formatIndianDigits("1000000")).toBe("10,00,000");
    expect(formatIndianDigits("1500000")).toBe("15,00,000");
  });
  it("groups crore values as X,XX,XX,XXX", () => {
    expect(formatIndianDigits("10000000")).toBe("1,00,00,000");
    expect(formatIndianDigits("12345678")).toBe("1,23,45,678");
  });
  it("groups hundred-crore values as XX,XX,XX,XX,XXX", () => {
    expect(formatIndianDigits("1000000000")).toBe("1,00,00,00,000");
  });
  it("strips leading zeros (except a lone zero)", () => {
    expect(formatIndianDigits("0100000")).toBe("1,00,000");
    expect(formatIndianDigits("0")).toBe("0");
  });
});

describe("targetToWords — Indian words", () => {
  it("emits Title-Case words for small values", () => {
    expect(targetToWords("1")?.words).toBe("One");
    expect(targetToWords("21")?.words).toBe("Twenty-One");
    expect(targetToWords("99")?.words).toBe("Ninety-Nine");
    expect(targetToWords("100")?.words).toBe("One Hundred");
    expect(targetToWords("999")?.words).toBe("Nine Hundred Ninety-Nine");
  });
  it("uses Thousand / Lakh / Crore instead of Million / Billion", () => {
    expect(targetToWords("1000")?.words).toBe("One Thousand");
    expect(targetToWords("100000")?.words).toBe("One Lakh");
    expect(targetToWords("1000000")?.words).toBe("Ten Lakh");
    expect(targetToWords("10000000")?.words).toBe("One Crore");
    expect(targetToWords("100000000")?.words).toBe("Ten Crore");
  });
  it("composes readouts with all four scale words", () => {
    expect(targetToWords("999999")?.words).toBe(
      "Nine Lakh Ninety-Nine Thousand Nine Hundred Ninety-Nine",
    );
    expect(targetToWords("12345678")?.words).toBe(
      "One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight",
    );
  });
  it("degrades gracefully beyond one Crore Crore", () => {
    // 1e11 → 10,000 crore
    expect(targetToWords("100000000000")?.words).toBe("Ten Thousand Crore");
  });
});

describe("targetToWords — readout envelope", () => {
  it("returns { value, formatted, words } together", () => {
    expect(targetToWords("100000")).toEqual({
      value: 100000,
      formatted: "1,00,000",
      words: "One Lakh",
    });
  });
  it("preserves the raw numeric business value", () => {
    // formatted string must never leak into the numeric channel.
    const r = targetToWords("1234567890");
    expect(r?.value).toBe(1234567890);
    expect(r?.formatted).toBe("1,23,45,67,890");
  });
  it("accepts a runtime integer as input", () => {
    const r = targetToWords(1_00_000);
    expect(r?.formatted).toBe("1,00,000");
    expect(r?.words).toBe("One Lakh");
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
    expect(targetToWords("1,00,000")).toBeNull();
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
  it("uses Indian grouping too", () => {
    expect(formatWithGrouping(100000)).toBe("1,00,000");
    expect(formatWithGrouping(1234567)).toBe("12,34,567");
  });
  it("handles bigints and non-finite numbers", () => {
    expect(formatWithGrouping(BigInt("10000000000"))).toBe("10,00,00,00,000");
    expect(formatWithGrouping(Infinity)).toBe("");
  });
});
