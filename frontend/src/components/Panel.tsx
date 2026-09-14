import { useId, useState } from "react";
import type { ReactNode } from "react";

interface PanelProps {
  /** Two-digit section index — order means something here, so it is shown. */
  index: string;
  title: string;
  note?: string;
  /** Emphasis: the primary plot gets more room and heavier type. */
  lead?: boolean;
  legend?: ReactNode;
  chart: ReactNode;
  /** The WCAG-clean twin. Every plot has one. */
  table: ReactNode;
}

/**
 * A section of the dashboard, sitting directly on the page under a rule rather
 * than inside a rounded card. Uniform cards flatten hierarchy — they claim
 * every section matters equally, which is not true of this page.
 *
 * The chart/table switch is a quiet text control instead of a segmented pill,
 * because it repeats on every section and identical loud chrome five times over
 * is noise.
 */
export function Panel({ index, title, note, lead = false, legend, chart, table }: PanelProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const panelId = useId();

  return (
    <section className={`panel${lead ? " panel--lead" : ""}`}>
      <header className="panel__head">
        <span className="panel__index" aria-hidden="true">
          {index}
        </span>
        <div className="panel__heading">
          <h2 className="panel__title">{title}</h2>
          {note && <p className="panel__note">{note}</p>}
        </div>
        <button
          type="button"
          className="panel__switch"
          aria-controls={panelId}
          aria-pressed={view === "table"}
          onClick={() => setView((current) => (current === "chart" ? "table" : "chart"))}
        >
          {view === "chart" ? "View as table" : "View as chart"}
        </button>
      </header>

      <div className="panel__body" id={panelId}>
        {view === "chart" ? (
          <>
            {legend}
            {chart}
          </>
        ) : (
          table
        )}
      </div>
    </section>
  );
}
