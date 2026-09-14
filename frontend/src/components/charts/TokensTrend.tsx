import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayRow } from "../../lib/aggregate";
import { formatCompact, formatDayShort, formatNumber } from "../../lib/format";
import { CHROME, SURFACE, colorScale } from "../../lib/palette";
import type { ChartMode } from "../../lib/palette";
import { ChartTooltip } from "./ChartTooltip";

interface TokensTrendProps {
  rows: readonly DayRow[];
  /** Stable key order — fixes each platform's colour regardless of filtering. */
  platforms: readonly string[];
  mode: ChartMode;
}

/**
 * Tokens per day, stacked by platform: change over time plus part-to-whole.
 * Segments are separated by a 2px surface stroke rather than a border.
 */
export function TokensTrend({ rows, platforms, mode }: TokensTrendProps) {
  const chrome = CHROME[mode];
  const color = colorScale(platforms, mode);
  const tickInterval = Math.max(0, Math.ceil(rows.length / 8) - 1);

  return (
    <div className="chart-frame chart-frame--tall">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows as DayRow[]} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={chrome.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDayShort}
            interval={tickInterval}
            tickLine={false}
            axisLine={{ stroke: chrome.axis }}
            tick={{ fill: chrome.label, fontSize: 11 }}
            minTickGap={16}
          />
          <YAxis
            tickFormatter={formatCompact}
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: chrome.label, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: chrome.axis, strokeWidth: 1 }}
            content={
              <ChartTooltip
                format={formatNumber}
                formatLabel={(label) => formatDayShort(label)}
                showTotal
                totalLabel="All platforms"
              />
            }
          />
          {platforms.map((platform) => (
            <Area
              key={platform}
              type="monotone"
              dataKey={platform}
              stackId="tokens"
              stroke={SURFACE[mode]}
              strokeWidth={2}
              fill={color(platform)}
              fillOpacity={0.9}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
