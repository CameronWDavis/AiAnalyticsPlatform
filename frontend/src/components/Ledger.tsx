import type { ReactNode } from "react";

/**
 * The dashboard's headline band.
 *
 * Replaces a row of equal-weight metric cards. Spend leads because it is what
 * the product is for; tokens and requests are subordinate typography in the
 * same band rather than peers in their own boxes. Hierarchy is the point.
 */

interface LedgerProps {
  /** The headline figure. */
  value: string;
  label: string;
  /** Percentage change vs. the preceding window; null when there is no baseline. */
  delta: number | null;
  /** True when a rise is bad, so the colour matches the meaning. */
  invertDelta?: boolean;
  deltaNote: string;
  /** Subordinate figures, rendered inline to the side. */
  figures: ReadonlyArray<{ label: string; value: string; delta?: number | null }>;
  /** The editorial line — what actually moved. */
  children?: ReactNode;
}

export function Ledger({
  value,
  label,
  delta,
  invertDelta = false,
  deltaNote,
  figures,
  children,
}: LedgerProps) {
  return (
    <section className="ledger" aria-label={label}>
      <div className="ledger__lead">
        <p className="ledger__label">{label}</p>
        <p className="ledger__value">{value}</p>
        <p className="ledger__delta">
          <Delta value={delta} invert={invertDelta} />
          {/* The note names the comparison window, so it only makes sense
              alongside an actual comparison. */}
          {delta !== null && Number.isFinite(delta) && <span className="ledger__note">{deltaNote}</span>}
        </p>
      </div>

      <div className="ledger__figures">
        {figures.map((figure) => (
          <div className="ledger__figure" key={figure.label}>
            <p className="ledger__figure-label">{figure.label}</p>
            <p className="ledger__figure-value">{figure.value}</p>
            {figure.delta !== undefined && (
              <p className="ledger__figure-delta">
                <Delta value={figure.delta} />
              </p>
            )}
          </div>
        ))}
      </div>

      {children}
    </section>
  );
}

function Delta({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  // No baseline means no delta. A change shown against nothing is noise.
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="delta delta--none">no prior period</span>;
  }
  if (value === 0) return <span className="delta delta--none">unchanged</span>;

  const isUp = value > 0;
  const isGood = invert ? !isUp : isUp;

  return (
    <span className={`delta ${isGood ? "delta--up" : "delta--down"}`}>
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(1)}%<span className="visually-hidden">{isUp ? " increase" : " decrease"}</span>
    </span>
  );
}

/**
 * The editorial line under the headline: which model moved the number, and by
 * how much. Renders nothing when no model moved meaningfully — an empty finding
 * is not worth a sentence.
 */
export function MoverLine({
  model,
  delta,
  percent,
  formatCurrency,
}: {
  model: string;
  delta: number;
  percent: number | null;
  formatCurrency: (value: number) => string;
}) {
  const direction = delta > 0 ? "added" : "saved";

  return (
    <p className="ledger__mover">
      <span className={`ledger__mover-flag ${delta > 0 ? "is-up" : "is-down"}`} aria-hidden="true" />
      <span className="mono">{model}</span> {direction} {formatCurrency(Math.abs(delta))}
      {percent !== null && <> ({percent > 0 ? "+" : ""}{percent.toFixed(0)}%)</>} — the biggest single move.
    </p>
  );
}
