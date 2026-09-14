export interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
  /** Formats each series value. */
  format: (value: number) => string;
  /** Header text; defaults to the raw category label. */
  formatLabel?: (label: string) => string;
  /** Appends a total row — useful on stacked charts. */
  showTotal?: boolean;
  totalLabel?: string;
}

/**
 * The tooltip enhances the chart, it never gates a value: everything shown here
 * is also reachable from the table view on the same card.
 */
export function ChartTooltip({
  active,
  label,
  payload,
  format,
  formatLabel,
  showTotal = false,
  totalLabel = "Total",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows = payload.filter((entry) => typeof entry.value === "number");
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, entry) => sum + (entry.value as number), 0);
  const heading = String(label ?? "");

  return (
    <div className="tooltip">
      <p className="tooltip__title">{formatLabel ? formatLabel(heading) : heading}</p>
      {rows.map((entry) => (
        <p className="tooltip__row" key={String(entry.dataKey ?? entry.name)}>
          <span className="tooltip__name">
            <span className="legend__swatch" style={{ background: entry.color }} aria-hidden="true" />
            {String(entry.name ?? entry.dataKey)}
          </span>
          <span className="tooltip__value">{format(entry.value as number)}</span>
        </p>
      ))}
      {showTotal && rows.length > 1 && (
        <p className="tooltip__row tooltip__total">
          <span className="tooltip__name">{totalLabel}</span>
          <span className="tooltip__value">{format(total)}</span>
        </p>
      )}
    </div>
  );
}
