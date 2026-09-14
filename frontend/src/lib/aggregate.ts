import type { Category, Prompt, UsageLog } from "../api/types";
import { MAX_SERIES } from "./palette";
import { parseDate, toNumber } from "./format";

export const OTHER_KEY = "Other";

export interface Filters {
  days: number;
  platform: string | "all";
  userId: number | "all";
}

/** Inclusive lower bound matching the analytics route: `date >= today - days`. */
export function windowStart(days: number, now = new Date()): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

export function filterLogs(logs: readonly UsageLog[], filters: Filters, now = new Date()): UsageLog[] {
  const start = windowStart(filters.days, now);
  return logs.filter((log) => {
    const date = parseDate(log.date);
    if (!date || date < start) return false;
    if (filters.platform !== "all" && log.platform !== filters.platform) return false;
    if (filters.userId !== "all" && log.user_id !== filters.userId) return false;
    return true;
  });
}

/** Stable, alphabetical list of platforms — the key order that fixes colours. */
export function distinctPlatforms(logs: readonly UsageLog[]): string[] {
  return [...new Set(logs.map((log) => log.platform))].sort((a, b) => a.localeCompare(b));
}

export interface SeriesKeys {
  /** Stable, capped key order — the colour assignment order. */
  keys: string[];
  /** Maps a raw platform to its series key, folding the tail into "Other". */
  resolve: (platform: string) => string;
}

/**
 * Caps the stacked platform series at the palette's limit. The top platforms by
 * volume keep their own hue; everything past the cap collapses into a single
 * "Other" band rather than being handed a generated colour.
 *
 * Ranking is computed from the *whole* dataset, so filtering the view never
 * reshuffles which platform owns which hue.
 */
export function platformSeries(allLogs: readonly UsageLog[], limit = MAX_SERIES): SeriesKeys {
  const volume = new Map<string, number>();
  for (const log of allLogs) {
    volume.set(log.platform, (volume.get(log.platform) ?? 0) + log.total_tokens);
  }

  const ranked = [...volume.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([platform]) => platform);

  if (ranked.length <= limit) {
    return { keys: ranked, resolve: (platform) => platform };
  }

  const head = new Set(ranked.slice(0, limit - 1));
  return {
    keys: [...ranked.slice(0, limit - 1), OTHER_KEY],
    resolve: (platform) => (head.has(platform) ? platform : OTHER_KEY),
  };
}

export interface Totals {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  cost: number;
  activeUsers: number;
}

export function totals(logs: readonly UsageLog[]): Totals {
  const users = new Set<number>();
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let requests = 0;
  let cost = 0;

  for (const log of logs) {
    users.add(log.user_id);
    totalTokens += log.total_tokens;
    inputTokens += log.input_tokens;
    outputTokens += log.output_tokens;
    requests += log.request_count;
    cost += toNumber(log.estimated_cost_usd);
  }

  return { totalTokens, inputTokens, outputTokens, requests, cost, activeUsers: users.size };
}

export interface DayRow {
  date: string;
  total: number;
  /** One numeric entry per platform key. */
  [platform: string]: string | number;
}

/**
 * Buckets tokens per day per platform, emitting a row for every day in the
 * window — including empty ones, so the x-axis has no invisible gaps.
 */
export function tokensByDay(
  logs: readonly UsageLog[],
  platforms: readonly string[],
  days: number,
  now = new Date(),
  resolve: (platform: string) => string = (platform) => platform,
): DayRow[] {
  const buckets = new Map<string, Map<string, number>>();
  for (const log of logs) {
    if (!log.date) continue;
    const key = resolve(log.platform);
    const day = buckets.get(log.date) ?? new Map<string, number>();
    day.set(key, (day.get(key) ?? 0) + log.total_tokens);
    buckets.set(log.date, day);
  }

  const rows: DayRow[] = [];
  const cursor = windowStart(days, now);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const day = buckets.get(key);
    const row: DayRow = { date: key, total: 0 };
    for (const platform of platforms) {
      const value = day?.get(platform) ?? 0;
      row[platform] = value;
      row.total += value;
    }
    rows.push(row);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return rows;
}

export interface BreakdownRow {
  key: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  cost: number;
}

function emptyRow(key: string): BreakdownRow {
  return { key, tokens: 0, inputTokens: 0, outputTokens: 0, requests: 0, cost: 0 };
}

/** Groups logs by any string field and sorts the result by token volume. */
export function breakdownBy(
  logs: readonly UsageLog[],
  field: "model" | "platform",
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>();
  for (const log of logs) {
    const key = log[field];
    const row = rows.get(key) ?? emptyRow(key);
    row.tokens += log.total_tokens;
    row.inputTokens += log.input_tokens;
    row.outputTokens += log.output_tokens;
    row.requests += log.request_count;
    row.cost += toNumber(log.estimated_cost_usd);
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.tokens - a.tokens);
}

export interface CategoryCount {
  key: string;
  count: number;
  /** The colour the user assigned to this category, when they set one. */
  color: string | null;
}

/** Counts prompts per category name, resolved through the categories list. */
export function promptsByCategory(
  prompts: readonly Prompt[],
  categories: readonly Category[],
): CategoryCount[] {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  const colorByName = new Map(categories.map((category) => [category.name, category.color]));

  const counts = new Map<string, number>();
  for (const prompt of prompts) {
    const name = prompt.category_id === null ? "Uncategorised" : nameById.get(prompt.category_id) ?? "Uncategorised";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count, color: colorByName.get(key) ?? null }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The window of equal length immediately before the current one, used for the
 * stat tiles' deltas. Same platform/user filters, shifted back by `days`.
 */
export function previousWindowLogs(
  logs: readonly UsageLog[],
  filters: Filters,
  now = new Date(),
): UsageLog[] {
  const end = windowStart(filters.days, now);
  const start = windowStart(filters.days * 2, now);
  return logs.filter((log) => {
    const date = parseDate(log.date);
    if (!date || date < start || date >= end) return false;
    if (filters.platform !== "all" && log.platform !== filters.platform) return false;
    if (filters.userId !== "all" && log.user_id !== filters.userId) return false;
    return true;
  });
}

/** Percentage change, or null when there is no baseline to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export interface Mover {
  key: string;
  /** Cost in the current window. */
  cost: number;
  /** Signed change against the previous window, in dollars. */
  delta: number;
  /** Signed change as a percentage, or null with no baseline to compare to. */
  percent: number | null;
}

/**
 * The model most responsible for the change in spend — the largest absolute
 * swing between the two windows, not simply the biggest spender.
 *
 * This replaces a vanity metric on the dashboard: a headline number is only
 * worth the space if someone would act on it, and "which model moved" is the
 * question the spend figure actually raises.
 */
export function topMover(
  currentLogs: readonly UsageLog[],
  previousLogs: readonly UsageLog[],
): Mover | null {
  // With nothing to compare against, every model's whole spend reads as though
  // it were newly "added". That is a baseline artefact, not a finding.
  if (previousLogs.length === 0) return null;

  const costs = new Map<string, { now: number; before: number }>();

  for (const log of currentLogs) {
    const entry = costs.get(log.model) ?? { now: 0, before: 0 };
    entry.now += toNumber(log.estimated_cost_usd);
    costs.set(log.model, entry);
  }
  for (const log of previousLogs) {
    const entry = costs.get(log.model) ?? { now: 0, before: 0 };
    entry.before += toNumber(log.estimated_cost_usd);
    costs.set(log.model, entry);
  }

  let best: Mover | null = null;
  for (const [key, { now, before }] of costs) {
    const delta = now - before;
    // Ignore noise: a few cents of drift is not a story.
    if (Math.abs(delta) < 0.01) continue;
    if (best === null || Math.abs(delta) > Math.abs(best.delta)) {
      best = { key, cost: now, delta, percent: percentChange(now, before) };
    }
  }

  return best;
}
