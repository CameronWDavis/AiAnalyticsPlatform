import { useMemo, useState } from "react";
import { getUsageLogs, getUsers } from "../api/endpoints";
import type { UsageLog, User } from "../api/types";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { ResourceView } from "../components/States";
import { useResource } from "../hooks/useResource";
import { formatCurrencyPrecise, formatDateLong, formatNumber } from "../lib/format";

export function UsageLogsPage() {
  const logs = useResource<UsageLog[]>((signal) => getUsageLogs(signal), []);
  const users = useResource<User[]>((signal) => getUsers(signal), []);
  const [search, setSearch] = useState("");

  const userName = useMemo(() => {
    const byId = new Map((users.data ?? []).map((user) => [user.id, user.name]));
    return (id: number) => byId.get(id) ?? `User ${id}`;
  }, [users.data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = logs.data ?? [];
    if (!query) return rows;
    return rows.filter((log) =>
      [log.model, log.platform, log.date ?? "", userName(log.user_id)].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [logs.data, search, userName]);

  const columns: Array<Column<UsageLog>> = [
    { key: "date", header: "Date", render: (row) => formatDateLong(row.date), sortValue: (row) => row.date ?? "" },
    { key: "user", header: "User", render: (row) => userName(row.user_id), sortValue: (row) => userName(row.user_id) },
    { key: "model", header: "Model", render: (row) => <span className="mono">{row.model}</span>, sortValue: (row) => row.model },
    { key: "platform", header: "Platform", render: (row) => row.platform, sortValue: (row) => row.platform },
    {
      key: "input",
      header: "Input",
      numeric: true,
      render: (row) => formatNumber(row.input_tokens),
      sortValue: (row) => row.input_tokens,
    },
    {
      key: "output",
      header: "Output",
      numeric: true,
      render: (row) => formatNumber(row.output_tokens),
      sortValue: (row) => row.output_tokens,
    },
    {
      key: "total",
      header: "Total",
      numeric: true,
      render: (row) => formatNumber(row.total_tokens),
      sortValue: (row) => row.total_tokens,
    },
    {
      key: "requests",
      header: "Requests",
      numeric: true,
      render: (row) => formatNumber(row.request_count),
      sortValue: (row) => row.request_count,
    },
    {
      key: "cost",
      header: "Cost",
      numeric: true,
      render: (row) => (row.estimated_cost_usd === null ? "—" : formatCurrencyPrecise(row.estimated_cost_usd)),
      sortValue: (row) => row.estimated_cost_usd ?? 0,
    },
  ];

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Usage logs</h1>
          <p className="page__subtitle">One row per user, day, model and platform — the raw table behind the charts.</p>
        </div>
      </header>

      <section className="sheet">
        <div className="table-toolbar">
          <input
            className="input"
            type="search"
            placeholder="Filter by model, platform, user or date…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Filter usage logs"
          />
          <span className="rowcount">
            {formatNumber(filtered.length)} of {formatNumber(logs.data?.length ?? 0)} rows
          </span>
        </div>

        <ResourceView
          data={logs.data}
          error={logs.error}
          isLoading={logs.isLoading}
          isRefreshing={logs.isRefreshing}
          onRetry={logs.reload}
          isEmpty={(rows) => rows.length === 0}
          emptyTitle="No usage logs yet"
          emptyDetail="Seed the database with database/seed.py to populate this view."
          skeletonHeight={320}
        >
          {() => (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(row) => String(row.id)}
              initialSort={{ key: "date", direction: "desc" }}
              emptyMessage={
                <>
                  <p className="state__title">Nothing matches “{search.trim()}”</p>
                  <p className="state__detail">
                    This box searches model, platform, user and date. Try a model name like{" "}
                    <code className="mono">gpt-4o</code>, or a date like <code className="mono">2026-09-14</code>.
                  </p>
                  <button type="button" className="button" onClick={() => setSearch("")}>
                    Clear filter
                  </button>
                </>
              }
              caption="Usage logs"
            />
          )}
        </ResourceView>
      </section>
    </div>
  );
}
