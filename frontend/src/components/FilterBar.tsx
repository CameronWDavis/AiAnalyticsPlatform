import type { User } from "../api/types";
import type { Filters } from "../lib/aggregate";

const DAY_PRESETS = [7, 30, 90] as const;

interface FilterBarProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  platforms: readonly string[];
  users: readonly User[];
  onRefresh: () => void;
}

/**
 * One filter row above everything it scopes — never per-chart filters. Every
 * chart on the page re-renders against the same slice.
 */
export function FilterBar({ filters, onChange, platforms, users, onRefresh }: FilterBarProps) {
  return (
    <div className="filters">
      <div className="filter" role="group" aria-label="Time range">
        <span className="filter__label">Range</span>
        <div className="segmented">
          {DAY_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              className="segmented__option"
              aria-pressed={filters.days === days}
              onClick={() => onChange({ ...filters, days })}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="filter">
        <label className="filter__label" htmlFor="filter-platform">
          Platform
        </label>
        <select
          id="filter-platform"
          className="select"
          value={filters.platform}
          onChange={(event) => onChange({ ...filters, platform: event.target.value })}
        >
          <option value="all">All platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </div>

      <div className="filter">
        <label className="filter__label" htmlFor="filter-user">
          User
        </label>
        <select
          id="filter-user"
          className="select"
          value={String(filters.userId)}
          onChange={(event) =>
            onChange({
              ...filters,
              userId: event.target.value === "all" ? "all" : Number(event.target.value),
            })
          }
        >
          <option value="all">All users</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="button filters__spacer" onClick={onRefresh}>
        <span aria-hidden="true">↻</span> Refresh
      </button>
    </div>
  );
}
