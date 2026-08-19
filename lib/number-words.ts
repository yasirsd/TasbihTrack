/**
 * English number-to-words for 1011 Tracker's Create/Edit Goal target
 * readability aid. Small, self-contained, no dependency.
 *
 * Supports integers in [0, 10^15). Returns null on invalid input. Rejects
 * negatives, decimals, exponential notation, Infinity, NaN, and values
 * beyond MAX_SAFE_INTEGER — per §58 numeric safety.
 */

const UNITS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const SCALES = [
  { value: 1_000_000_000_000n, name: "trillion" },
  { value: 1_000_000_000n, name: "billion" },
  { value: 1_000_000n, name: "million" },
  { value: 1_000n, name: "thousand" },
];

/**
 * Parses a user-supplied string into a validated integer, then converts.
 * @returns { value, words } on success; null on invalid input.
 */
export function targetToWords(input: string | number): {
  value: number;
  words: string;
} | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || !Number.isInteger(input) || input < 0) return null;
    if (input > Number.MAX_SAFE_INTEGER) return null;
    return { value: input, words: numberToWords(BigInt(input)) };
  }
  const s = input.trim();
  if (!s) return null;
  // Reject anything that isn't pure digits — rejects "1e6", "-1", "1.5",
  // "1,000" (formatted input) and any locale noise.
  if (!/^\d+$/.test(s)) return null;
  const asBig = BigInt(s);
  if (asBig < 0n) return null;
  if (asBig > 999_999_999_999_999n) return null; // < 10^15
  const asNum = Number(asBig);
  if (!Number.isSafeInteger(asNum)) return null;
  return { value: asNum, words: numberToWords(asBig) };
}

function numberToWords(n: bigint): string {
  if (n === 0n) return "zero";
  const parts: string[] = [];
  let remaining = n;
  for (const { value, name } of SCALES) {
    if (remaining >= value) {
      const chunk = remaining / value;
      remaining = remaining % value;
      parts.push(`${threeDigitToWords(Number(chunk))} ${name}`);
    }
  }
  if (remaining > 0n) parts.push(threeDigitToWords(Number(remaining)));
  return capitalize(parts.join(" ").trim());
}

function threeDigitToWords(n: number): string {
  if (n < 0 || n > 999) return "";
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) parts.push(`${UNITS[hundreds]} hundred`);
  if (rest === 0) return parts.join(" ");
  if (rest < 20) {
    parts.push(UNITS[rest]);
  } else {
    const tens = Math.floor(rest / 10);
    const units = rest % 10;
    parts.push(units === 0 ? TENS[tens] : `${TENS[tens]}-${UNITS[units]}`);
  }
  return parts.join(" ");
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Formats an integer with locale grouping (e.g. "100,000"). Falls back to
 * raw digits for very large values where locale formatting would truncate.
 */
export function formatWithGrouping(value: number | bigint): string {
  if (typeof value === "bigint") return value.toLocaleString("en-US");
  if (!Number.isFinite(value)) return "";
  return Math.round(value).toLocaleString("en-US");
}
