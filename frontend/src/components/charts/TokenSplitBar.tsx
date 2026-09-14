import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BreakdownRow } from "../../lib/aggregate";
import { formatCompact, formatNumber } from "../../lib/format";
import { CHROME, ORDINAL_PAIR, SURFACE } from "../../lib/palette";
import type { ChartMode } from "../../lib/palette";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Input vs. output tokens per model. Both halves are the same quantity in an
 * ordered split, so this uses two shades of one hue rather than two identities
 * — which also keeps the categorical slots meaning "platform" everywhere else.
 */
export function TokenSplitBar({ rows, mode }: { rows: readonly BreakdownRow[]; mode: ChartMode }) {
  const chrome = CHROME[mode];
  const shades = ORDINAL_PAIR[mode];
  const height = Math.max(180, rows.length * 34 + 44);
  const longestLabel = rows.reduce((max, row) => Math.max(max, row.key.length), 0);

  return (
    <div className="chart-frame" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows as BreakdownRow[]}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke={chrome.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={formatCompact}
            tickLine={false}
            axisLine={{ stroke: chrome.axis }}
            tick={{ fill: chrome.label, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="key"
            width={Math.min(160, Math.max(72, longestLabel * 7))}
            tickLine={false}
            axisLine={{ stroke: chrome.axis }}
            tick={{ fill: chrome.label, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: chrome.grid, fillOpacity: 0.4 }}
            content={<ChartTooltip format={formatNumber} showTotal totalLabel="Total tokens" />}
          />
          {/* The 2px surface stroke is the gap between stacked segments. */}
          <Bar
            dataKey="inputTokens"
            name="Input"
            stackId="tokens"
            fill={shades.light}
            stroke={SURFACE[mode]}
            strokeWidth={2}
            isAnimationActive={false}
            maxBarSize={22}
          />
          <Bar
            dataKey="outputTokens"
            name="Output"
            stackId="tokens"
            fill={shades.dark}
            stroke={SURFACE[mode]}
            strokeWidth={2}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
