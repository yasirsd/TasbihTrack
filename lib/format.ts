export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

export function formatPercent(pct: number, digits = 0): string {
  if (!Number.isFinite(pct)) return "0%";
  const clamped = Math.max(0, Math.min(pct, 999));
  return `${clamped.toFixed(digits)}%`;
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatSigned(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`;
  return formatNumber(n);
}
