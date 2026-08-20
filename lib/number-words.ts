/**
 * Indian-format target-amount helpers for 1011 Tracker.
 *
 * Phase 7.2 P0.2 — the Create/Edit Goal target field speaks the Indian
 * numbering system (Thousand → Lakh → Crore) because the app's audience
 * types goals like `100000` and expects to see `1,00,000` and read
 * `One Lakh` — not `100,000` / `One Hundred Thousand`.
 *
 * The module exposes three primitives:
 *
 *   • `formatIndianDigits(digitStr)` — pure string → string grouping.
 *     Groups the last three digits, then pairs of two moving left.
 *     100000 → "1,00,000". 10000000 → "1,00,00,000".
 *
 *   • `targetToWords(input)` — validates input, returns
 *     `{ value, formatted, words }`. The underlying `value` is the
 *     numeric business-logic quantity; `formatted` is what the input
 *     itself displays; `words` is the helper readout ("One Lakh").
 *
 *   • `formatWithGrouping(value)` — kept for callers outside the target
 *     field flow that just need Indian grouping of a runtime integer.
 *
 * Validation still enforces §58 numeric safety: integers only, no
 * decimals / negatives / exponentials / NaN / Infinity, capped below
 * 10^15 so Number.MAX_SAFE_INTEGER is never breached.
 */

const UNITS_TC = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS_TC = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const CRORE = 10_000_000n; // 1 Crore  = 10^7
const LAKH = 100_000n; //     1 Lakh   = 10^5
const THOUSAND = 1_000n;

export interface TargetReadout {
  /** The validated numeric quantity — business-logic source of truth. */
  value: number;
  /** Indian-formatted digits (e.g. "1,00,000") — safe to display in the input. */
  formatted: string;
  /** Indian words (e.g. "One Lakh") — the humaniser shown below the field. */
  words: string;
}

/**
 * Group a digit-only string using Indian numbering conventions
 * (last three digits, then pairs of two moving left).
 *
 * Pure — does not sanitise input; caller must ensure `digitStr` matches
 * /^\d*$/. Empty string returns empty string.
 */
export function formatIndianDigits(digitStr: string): string {
  if (!digitStr) return "";
  // Strip leading zeros for grouping but preserve a lone "0".
  const trimmed = digitStr.replace(/^0+(?=\d)/, "");
  if (trimmed.length <= 3) return trimmed;
  const last3 = trimmed.slice(-3);
  const rest = trimmed.slice(0, -3);
  // Group the leading portion in pairs from the right.
  const reversed = rest.split("").reverse().join("");
  const chunks = reversed.match(/.{1,2}/g) ?? [];
  const grouped = chunks.map((c) => c.split("").reverse().join("")).reverse().join(",");
  return `${grouped},${last3}`;
}

/**
 * Validates + converts an integer-shaped input into an Indian-format
 * readout. Returns `null` on any invalid input so the UI can render a
 * placeholder helper without crashing.
 */
export function targetToWords(input: string | number): TargetReadout | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || !Number.isInteger(input) || input < 0) return null;
    if (input > Number.MAX_SAFE_INTEGER) return null;
    const asBig = BigInt(input);
    return {
      value: input,
      formatted: formatIndianDigits(asBig.toString()),
      words: numberToIndianWords(asBig),
    };
  }
  const s = input.trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return null;
  const asBig = BigInt(s);
  if (asBig < 0n) return null;
  if (asBig > 999_999_999_999_999n) return null; // < 10^15
  const asNum = Number(asBig);
  if (!Number.isSafeInteger(asNum)) return null;
  return {
    value: asNum,
    formatted: formatIndianDigits(asBig.toString()),
    words: numberToIndianWords(asBig),
  };
}

/**
 * Convert a bigint into Indian-numbering-system words. Recursive on
 * the crore multiplier so extreme values still degrade to something
 * readable (e.g. `1e13` → "Ten Lakh Crore").
 */
function numberToIndianWords(n: bigint): string {
  if (n === 0n) return "Zero";
  const parts: string[] = [];
  let rem = n;
  if (rem >= CRORE) {
    const c = rem / CRORE;
    rem = rem % CRORE;
    parts.push(`${numberToIndianWords(c)} Crore`);
  }
  if (rem >= LAKH) {
    const l = Number(rem / LAKH);
    rem = rem % LAKH;
    parts.push(`${twoDigitWords(l)} Lakh`);
  }
  if (rem >= THOUSAND) {
    const t = Number(rem / THOUSAND);
    rem = rem % THOUSAND;
    parts.push(`${twoDigitWords(t)} Thousand`);
  }
  if (rem >= 100n) {
    const h = Number(rem / 100n);
    rem = rem % 100n;
    parts.push(`${UNITS_TC[h]} Hundred`);
  }
  if (rem > 0n) {
    parts.push(twoDigitWords(Number(rem)));
  }
  return parts.join(" ");
}

/**
 * Words for a value in [1, 99]. Values outside that range come from a
 * bug in the caller; return an empty string so we never emit garbage.
 */
function twoDigitWords(n: number): string {
  if (n <= 0 || n > 99) return "";
  if (n < 20) return UNITS_TC[n];
  const tens = Math.floor(n / 10);
  const units = n % 10;
  return units === 0 ? TENS_TC[tens] : `${TENS_TC[tens]}-${UNITS_TC[units]}`;
}

/**
 * Runtime-integer formatter using Indian grouping. Kept for
 * back-compat callers that don't need the full validated readout.
 */
export function formatWithGrouping(value: number | bigint): string {
  if (typeof value === "bigint") return formatIndianDigits(value.toString());
  if (!Number.isFinite(value)) return "";
  return formatIndianDigits(Math.round(value).toString());
}
