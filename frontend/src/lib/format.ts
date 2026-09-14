/** Guards a nullable numeric field, and anything that arrives as a string. */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

/** "1.2M" — for axis ticks and stat tiles where space is tight. */
export const formatCompact = (value: number): string => compact.format(value);

/** "1,234,567" — for tables and tooltips where the exact number matters. */
export const formatNumber = (value: number): string => full.format(value);

export const formatCurrency = (value: number): string => usd.format(value);

/** Keeps sub-cent costs readable instead of rounding them to $0.00. */
export function formatCurrencyPrecise(value: number): string {
  if (value !== 0 && Math.abs(value) < 0.01) return usdPrecise.format(value);
  return usd.format(value);
}

export function formatPercent(value: number, total: number): string {
  if (total <= 0) return "—";
  return `${((value / total) * 100).toFixed(1)}%`;
}

/** "Sep 14" — compact axis label for a "YYYY-MM-DD" key. */
export function formatDayShort(isoDate: string): string {
  const date = parseDate(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** "Sep 14, 2026" — used in tooltips and table cells. */
export function formatDateLong(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Parses the API's ISO 8601 timestamps and bare "YYYY-MM-DD" date columns. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // A bare "YYYY-MM-DD" parses as UTC midnight, which is what the date columns mean.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Trims long prompt text for table cells without cutting mid-word. */
export function truncate(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trimEnd()}…`;
}
