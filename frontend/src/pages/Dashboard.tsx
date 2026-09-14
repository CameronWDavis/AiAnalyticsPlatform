import { useCallback, useMemo } from "react";
import { getCategories, getPrompts, getUsageLogs, getUsers } from "../api/endpoints";
import type { UsageLog, User } from "../api/types";
import { Ledger, MoverLine } from "../components/Ledger";
import { Panel } from "../components/Panel";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { Legend } from "../components/Legend";
import type { LegendEntry } from "../components/Legend";
import { ErrorState, LoadingState } from "../components/States";
import { RankedBar } from "../components/charts/RankedBar";
import { TokenSplitBar } from "../components/charts/TokenSplitBar";
import { TokensTrend } from "../components/charts/TokensTrend";
import { useChartMode } from "../hooks/themeContext";
import { useFilters } from "../hooks/useFilters";
import { useResource } from "../hooks/useResource";
import {
  breakdownBy,
  distinctPlatforms,
  filterLogs,
  percentChange,
  platformSeries,
  topMover,
  previousWindowLogs,
  promptsByCategory,
  tokensByDay,
  totals,
} from "../lib/aggregate";
import type { BreakdownRow, CategoryCount, DayRow } from "../lib/aggregate";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyPrecise,
  formatDateLong,
  formatNumber,
  formatPercent,
} from "../lib/format";
import { ORDINAL_PAIR, colorScale } from "../lib/palette";

export function Dashboard() {
  const mode = useChartMode();
  const [filters, setFilters] = useFilters();

  const logsResource = useResource<UsageLog[]>((signal) => getUsageLogs(signal), []);
  const usersResource = useResource<User[]>((signal) => getUsers(signal), []);
  const promptsResource = useResource((signal) => getPrompts(signal), []);
  const categoriesResource = useResource((signal) => getCategories(signal), []);

  const reloadAll = useCallback(() => {
    logsResource.reload();
    usersResource.reload();
    promptsResource.reload();
    categoriesResource.reload();
  }, [logsResource, usersResource, promptsResource, categoriesResource]);

  const allLogs = useMemo(() => logsResource.data ?? [], [logsResource.data]);

  // The stable key order that pins each platform's colour: derived from the
  // full dataset, never from the filtered slice, so filtering never repaints.
  // Past the palette's series cap the tail folds into a single "Other" band.
  const allPlatforms = useMemo(() => distinctPlatforms(allLogs), [allLogs]);
  const series = useMemo(() => platformSeries(allLogs), [allLogs]);
  const platformColor = useMemo(() => colorScale(series.keys, mode), [series.keys, mode]);

  const scoped = useMemo(() => filterLogs(allLogs, filters), [allLogs, filters]);
  const previous = useMemo(() => previousWindowLogs(allLogs, filters), [allLogs, filters]);

  const current = useMemo(() => totals(scoped), [scoped]);
  const prior = useMemo(() => totals(previous), [previous]);

  const visibleSeries = useMemo(
    () => series.keys.filter((key) => scoped.some((log) => series.resolve(log.platform) === key)),
    [series, scoped],
  );

  const trendRows = useMemo(
    () => tokensByDay(scoped, visibleSeries, filters.days, new Date(), series.resolve),
    [scoped, visibleSeries, filters.days, series],
  );
  const byModel = useMemo(() => breakdownBy(scoped, "model"), [scoped]);
  const byPlatform = useMemo(() => breakdownBy(scoped, "platform"), [scoped]);
  const splitRows = useMemo(() => byModel.slice(0, 8), [byModel]);

  const mover = useMemo(() => topMover(scoped, previous), [scoped, previous]);

  const categoryRows = useMemo(
    () => groupWithOther8(promptsByCategory(promptsResource.data ?? [], categoriesResource.data ?? [])),
    [promptsResource.data, categoriesResource.data],
  );

  const isEmpty = allLogs.length > 0 && scoped.length === 0;

  if (logsResource.error) {
    return (
      <div className="page">
        <ErrorState error={logsResource.error} onRetry={reloadAll} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle">
            Token spend and prompt activity across every connected model and platform.
          </p>
        </div>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        platforms={allPlatforms}
        users={usersResource.data ?? []}
        onRefresh={reloadAll}
      />

      {logsResource.isLoading ? (
        <LoadingState height={132} />
      ) : (
        <div className={logsResource.isRefreshing ? "is-refreshing" : undefined}>
          <Ledger
            label={`Estimated spend · last ${filters.days} days`}
            value={formatCurrency(current.cost)}
            delta={percentChange(current.cost, prior.cost)}
            invertDelta
            deltaNote={`vs the ${filters.days} days before`}
            figures={[
              {
                label: "Tokens",
                value: formatCompact(current.totalTokens),
                delta: percentChange(current.totalTokens, prior.totalTokens),
              },
              {
                label: "Requests",
                value: formatNumber(current.requests),
                delta: percentChange(current.requests, prior.requests),
              },
              {
                label: "Cost per 1M tokens",
                value:
                  current.totalTokens > 0
                    ? formatCurrencyPrecise((current.cost / current.totalTokens) * 1_000_000)
                    : "—",
              },
            ]}
          >
            {mover && (
              <MoverLine
                model={mover.key}
                delta={mover.delta}
                percent={mover.percent}
                formatCurrency={formatCurrencyPrecise}
              />
            )}
          </Ledger>
        </div>
      )}

      {isEmpty && (
        <p className="banner">
          No usage logs match these filters. Widen the range or clear the platform and user filters.
        </p>
      )}

      <Panel
        index="01"
        lead
        title="Tokens over time"
        note={`Daily totals, stacked by platform · last ${filters.days} days`}
        legend={<Legend entries={legendFor(visibleSeries, platformColor)} />}
        chart={
          logsResource.isLoading ? (
            <LoadingState height={320} />
          ) : (
            <div className={logsResource.isRefreshing ? "is-refreshing" : undefined}>
              <TokensTrend rows={trendRows} platforms={visibleSeries} mode={mode} />
            </div>
          )
        }
        table={<TrendTable rows={trendRows} platforms={visibleSeries} />}
      />

      <div className="chart-grid chart-grid--split">
        <Panel
          index="02"
          title="Tokens by model"
          note="Total tokens consumed per model"
          chart={<RankedBar rows={toRanked(byModel, "tokens")} mode={mode} name="Tokens" format={formatNumber} />}
          table={<BreakdownTable rows={byModel} label="Model" total={current.totalTokens} />}
        />

        <Panel
          index="03"
          title="Cost by platform"
          note="Estimated spend in USD"
          legend={<Legend entries={legendFor([...new Set(byPlatform.map((row) => series.resolve(row.key)))], platformColor)} />}
          chart={
            <RankedBar
              rows={toRanked(byPlatform, "cost")}
              mode={mode}
              name="Cost"
              format={formatCurrencyPrecise}
              tickFormat={formatCurrency}
              colorFor={(key) => platformColor(series.resolve(key))}
            />
          }
          table={<BreakdownTable rows={byPlatform} label="Platform" total={current.totalTokens} />}
        />
      </div>

      <Panel
        index="04"
        title="Input vs. output tokens"
        note="Per model, top 8 by volume"
        legend={
          <Legend
            entries={[
              { key: "input", label: "Input", color: ORDINAL_PAIR[mode].light },
              { key: "output", label: "Output", color: ORDINAL_PAIR[mode].dark },
            ]}
          />
        }
        chart={<TokenSplitBar rows={splitRows} mode={mode} />}
        table={<BreakdownTable rows={splitRows} label="Model" total={current.totalTokens} />}
      />

      <Panel
        index="05"
        title="Prompts by category"
        note="How prompts are distributed across user-defined categories"
        chart={
          promptsResource.isLoading || categoriesResource.isLoading ? (
            <LoadingState height={240} />
          ) : (
            <RankedBar
              rows={categoryRows.map((row) => ({ key: row.key, value: row.count }))}
              mode={mode}
              name="Prompts"
              format={formatNumber}
            />
          )
        }
        table={<CategoryTable rows={categoryRows} />}
      />
    </div>
  );
}

/** Categories are nominal, so the tail folds into "Other" rather than new hues. */
function groupWithOther8(rows: readonly CategoryCount[]): CategoryCount[] {
  const LIMIT = 8;
  if (rows.length <= LIMIT) return [...rows];
  const head = rows.slice(0, LIMIT - 1);
  const tail = rows.slice(LIMIT - 1);
  return [...head, { key: "Other", count: tail.reduce((sum, row) => sum + row.count, 0), color: null }];
}

function toRanked(rows: readonly BreakdownRow[], field: "tokens" | "cost") {
  return rows.map((row) => ({ key: row.key, value: row[field] }));
}

function legendFor(keys: readonly string[], color: (key: string) => string): LegendEntry[] {
  return keys.map((key) => ({ key, label: key, color: color(key) }));
}

function TrendTable({ rows, platforms }: { rows: readonly DayRow[]; platforms: readonly string[] }) {
  const columns: Array<Column<DayRow>> = [
    {
      key: "date",
      header: "Date",
      render: (row) => formatDateLong(row.date),
      sortValue: (row) => row.date,
    },
    ...platforms.map<Column<DayRow>>((platform) => ({
      key: platform,
      header: platform,
      numeric: true,
      render: (row) => formatNumber(Number(row[platform] ?? 0)),
      sortValue: (row) => Number(row[platform] ?? 0),
    })),
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (row) => formatNumber(row.total),
      sortValue: (row) => row.total,
    },
  ];

  return (
    <DataTable
      rows={rows.filter((row) => row.total > 0)}
      columns={columns}
      rowKey={(row) => row.date}
      initialSort={{ key: "date", direction: "desc" }}
      emptyMessage="No usage recorded in this window."
      caption="Daily token totals by platform"
    />
  );
}

function BreakdownTable({
  rows,
  label,
  total,
}: {
  rows: readonly BreakdownRow[];
  label: string;
  total: number;
}) {
  const columns: Array<Column<BreakdownRow>> = [
    { key: "key", header: label, render: (row) => row.key, sortValue: (row) => row.key },
    {
      key: "tokens",
      header: "Tokens",
      numeric: true,
      render: (row) => formatNumber(row.tokens),
      sortValue: (row) => row.tokens,
    },
    {
      key: "share",
      header: "Share",
      numeric: true,
      render: (row) => formatPercent(row.tokens, total),
      sortValue: (row) => row.tokens,
    },
    {
      key: "input",
      header: "Input",
      numeric: true,
      render: (row) => formatNumber(row.inputTokens),
      sortValue: (row) => row.inputTokens,
    },
    {
      key: "output",
      header: "Output",
      numeric: true,
      render: (row) => formatNumber(row.outputTokens),
      sortValue: (row) => row.outputTokens,
    },
    {
      key: "requests",
      header: "Requests",
      numeric: true,
      render: (row) => formatNumber(row.requests),
      sortValue: (row) => row.requests,
    },
    {
      key: "cost",
      header: "Cost",
      numeric: true,
      render: (row) => formatCurrencyPrecise(row.cost),
      sortValue: (row) => row.cost,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.key}
      initialSort={{ key: "tokens", direction: "desc" }}
      emptyMessage="No usage recorded in this window."
      caption={`Usage by ${label.toLowerCase()}`}
    />
  );
}

function CategoryTable({ rows }: { rows: readonly CategoryCount[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const columns: Array<Column<CategoryCount>> = [
    {
      key: "key",
      header: "Category",
      render: (row) => (
        <span className="chip">
          <span className="chip__dot" style={row.color ? { background: row.color } : undefined} aria-hidden="true" />
          {row.key}
        </span>
      ),
      sortValue: (row) => row.key,
    },
    {
      key: "count",
      header: "Prompts",
      numeric: true,
      render: (row) => formatNumber(row.count),
      sortValue: (row) => row.count,
    },
    {
      key: "share",
      header: "Share",
      numeric: true,
      render: (row) => formatPercent(row.count, total),
      sortValue: (row) => row.count,
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.key}
      initialSort={{ key: "count", direction: "desc" }}
      emptyMessage="No prompts have been categorised yet."
      caption="Prompt counts by category"
    />
  );
}
