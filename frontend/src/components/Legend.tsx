export interface LegendEntry {
  key: string;
  label: string;
  color: string;
}

/**
 * Always rendered for two or more series: identity is never carried by colour
 * alone, which is also the relief for the light-mode contrast warning on the
 * third categorical slot.
 */
export function Legend({ entries }: { entries: readonly LegendEntry[] }) {
  if (entries.length < 2) return null;

  return (
    <ul className="legend">
      {entries.map((entry) => (
        <li key={entry.key} className="legend__item">
          <span className="legend__swatch" style={{ background: entry.color }} aria-hidden="true" />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
