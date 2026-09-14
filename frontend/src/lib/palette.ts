/**
 * Chart colour slots.
 *
 * A brand-green-led categorical order, validated against the surfaces this app
 * actually renders on (white #ffffff / charcoal #121816), not the reference
 * defaults. Both modes clear the all-pairs CVD gate (worst ΔE 9.0 light / 9.2
 * dark) and the normal-vision floor (24.3 light / 21.4 dark).
 *
 * The brand green sits at 2.86:1 on white — below the 3:1 mark — so every
 * multi-series chart ships a legend and a table view as the required relief.
 *
 * Do not add a 4th slot by inventing a hue: fold the tail into "Other"
 * instead — see platformSeries() in aggregate.ts.
 */
export type ChartMode = "light" | "dark";

export const CATEGORICAL: Record<ChartMode, readonly string[]> = {
  light: ["#0fae76", "#2a78d6", "#eb6834"],
  dark: ["#119c6b", "#3987e5", "#d95926"],
};

/** The de-emphasis colour for an "Other" bucket — never a generated 4th hue. */
export const OTHER_COLOR: Record<ChartMode, string> = {
  light: "#898781",
  dark: "#898781",
};

/** Single-hue sequential steps (blue), light → dark, for magnitude-only charts. */
export const SEQUENTIAL: Record<ChartMode, readonly string[]> = {
  // Ordinal use starts no lighter than step 250 on light, no darker than 600 on dark.
  light: ["#3fbd90", "#2fb183", "#1fa579", "#0fae76", "#0d9e6a", "#0a8c5f", "#076e4b"],
  dark: ["#c8f5e1", "#a9eed2", "#8fe9c4", "#6fdfb3", "#4ed2a0", "#2ec38c", "#119c6b"],
};

/** One hue for every bar when a chart shows a single series. */
export const SINGLE_SERIES: Record<ChartMode, string> = {
  light: "#0fae76",
  dark: "#119c6b",
};

export const MAX_SERIES = CATEGORICAL.light.length;

/**
 * Assigns a colour to each key by its position in a *stable* key order, so a
 * filter that removes a series never repaints the survivors. Colour follows the
 * entity, not its current rank.
 */
export function colorScale(stableKeys: readonly string[], mode: ChartMode): (key: string) => string {
  const slots = CATEGORICAL[mode];
  const assignment = new Map<string, string>();
  stableKeys.forEach((key, index) => {
    const slot = slots[index % slots.length];
    assignment.set(key, index < slots.length && slot ? slot : OTHER_COLOR[mode]);
  });
  return (key: string) => assignment.get(key) ?? OTHER_COLOR[mode];
}

/** Picks a sequential step for a value in [0, max]. */
export function sequentialStep(value: number, max: number, mode: ChartMode): string {
  const steps = SEQUENTIAL[mode];
  if (max <= 0 || steps.length === 0) return steps[0] ?? SINGLE_SERIES[mode];
  const index = Math.min(steps.length - 1, Math.floor((value / max) * steps.length));
  return steps[index] ?? SINGLE_SERIES[mode];
}

/**
 * Two shades of the sequential hue for input vs. output tokens — an ordered
 * part-to-whole of the same quantity, so one hue rather than two identities.
 * Validated with --ordinal: monotone lightness, ΔL gap clear, and the light end
 * clears 2:1 against the surface in both modes.
 */
export const ORDINAL_PAIR: Record<ChartMode, { light: string; dark: string }> = {
  light: { light: "#3fbd90", dark: "#076e4b" },
  dark: { light: "#8fe9c4", dark: "#119c6b" },
};

/** Chart surfaces — SVG marks need a literal colour for the 2px separation gap. */
export const SURFACE: Record<ChartMode, string> = {
  light: "#ffffff",
  dark: "#121816",
};

/** Recessive chrome, one shade off the surface. Solid hairlines, never dashed. */
export const CHROME: Record<ChartMode, { grid: string; axis: string; label: string }> = {
  light: { grid: "#e8eeeb", axis: "#c5d2cc", label: "#7a8b83" },
  dark: { grid: "#1e2926", axis: "#2c3a35", label: "#7a8b83" },
};
