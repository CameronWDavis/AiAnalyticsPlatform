import { useMemo } from "react";
import { getUsageLogs, getUsers } from "../api/endpoints";
import type { UsageLog, User } from "../api/types";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { ResourceView } from "../components/States";
import { useResource } from "../hooks/useResource";
import { formatCurrencyPrecise, formatDateLong, formatNumber, toNumber } from "../lib/format";

interface UserRow extends User {
  tokens: number;
  requests: number;
  cost: number;
}

export function UsersPage() {
  const users = useResource<User[]>((signal) => getUsers(signal), []);
  const logs = useResource<UsageLog[]>((signal) => getUsageLogs(signal), []);

  const rows = useMemo<UserRow[]>(() => {
    const totals = new Map<number, { tokens: number; requests: number; cost: number }>();
    for (const log of logs.data ?? []) {
      const entry = totals.get(log.user_id) ?? { tokens: 0, requests: 0, cost: 0 };
      entry.tokens += log.total_tokens;
      entry.requests += log.request_count;
      entry.cost += toNumber(log.estimated_cost_usd);
      totals.set(log.user_id, entry);
    }

    return (users.data ?? []).map((user) => ({
      ...user,
      ...(totals.get(user.id) ?? { tokens: 0, requests: 0, cost: 0 }),
    }));
  }, [users.data, logs.data]);

  const columns: Array<Column<UserRow>> = [
    { key: "name", header: "Name", render: (row) => row.name, sortValue: (row) => row.name },
    { key: "email", header: "Email", render: (row) => <span className="mono">{row.email}</span>, sortValue: (row) => row.email },
    {
      key: "created",
      header: "Joined",
      render: (row) => formatDateLong(row.created_at),
      sortValue: (row) => row.created_at ?? "",
    },
    {
      key: "tokens",
      header: "Tokens (all time)",
      numeric: true,
      render: (row) => formatNumber(row.tokens),
      sortValue: (row) => row.tokens,
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
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Users</h1>
          <p className="page__subtitle">Everyone on the platform, with their all-time usage totals.</p>
        </div>
      </header>

      <section className="sheet">
        <ResourceView
          data={users.data}
          error={users.error}
          isLoading={users.isLoading}
          isRefreshing={users.isRefreshing || logs.isRefreshing}
          onRetry={users.reload}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No users yet"
          emptyDetail="Seed the database with database/seed.py to populate this view."
          skeletonHeight={240}
        >
          {() => (
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(row) => String(row.id)}
              initialSort={{ key: "tokens", direction: "desc" }}
              caption="Users and their usage totals"
            />
          )}
        </ResourceView>
      </section>
    </div>
  );
}
