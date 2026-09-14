import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact } from "../../lib/format";
import { CHROME, SINGLE_SERIES } from "../../lib/palette";
import type { ChartMode } from "../../lib/palette";
import { ChartTooltip } from "./ChartTooltip";

export interface RankedRow {
  key: string;
  value: number;
}

interface RankedBarProps {
  rows: readonly RankedRow[];
  mode: ChartMode;
  /** Series name shown in the tooltip. */
  name: string;
  format: (value: number) => string;
  /** Per-bar colour override; defaults to one hue for the whole series. */
  colorFor?: (key: string) => string;
  /** Short axis-tick formatter; falls back to the tooltip formatter. */
  tickFormat?: (value: number) => string;
  height?: number;
}

/**
 * Horizontal ranked bars — the default for magnitude across long-named
 * categories. One series means one colour, never a value-ramp over nominal
 * categories. Bar ends are rounded 4px and anchored to the baseline.
 */
export function RankedBar({ rows, mode, name, format, colorFor, tickFormat, height }: RankedBarProps) {
  const chrome = CHROME[mode];
  const fallback = SINGLE_SERIES[mode];
  const frameHeight = height ?? Math.max(180, rows.length * 34 + 44);
  const longestLabel = rows.reduce((max, row) => Math.max(max, row.key.length), 0);
  const axisWidth = Math.min(160, Math.max(72, longestLabel * 7));

  return (
    <div className="chart-frame" style={{ height: frameHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows as RankedRow[]}
          layout="vertical"
          margin={{ top: 4, right: 52, bottom: 4, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke={chrome.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={tickFormat ?? formatCompact}
            tickLine={false}
            axisLine={{ stroke: chrome.axis }}
            tick={{ fill: chrome.label, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="key"
            width={axisWidth}
            tickLine={false}
            axisLine={{ stroke: chrome.axis }}
            tick={{ fill: chrome.label, fontSize: 11 }}
          />
          <Tooltip cursor={{ fill: chrome.grid, fillOpacity: 0.4 }} content={<ChartTooltip format={format} />} />
          <Bar dataKey="value" name={name} radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={22}>
            {rows.map((row) => (
              <Cell key={row.key} fill={colorFor ? colorFor(row.key) : fallback} />
            ))}
            {/* Labels sit outside the bar end, so a short bar never clips them. */}
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              formatter={(value: unknown) => (typeof value === "number" ? format(value) : "")}
              style={{ fill: chrome.label, fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
