import { useMemo } from "react";
import { getCategories, getPrompts, getUsers } from "../api/endpoints";
import type { Category, Prompt, User } from "../api/types";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { ResourceView } from "../components/States";
import { useResource } from "../hooks/useResource";
import { formatNumber } from "../lib/format";

interface CategoryRow extends Category {
  owner: string;
  prompts: number;
}

export function CategoriesPage() {
  const categories = useResource<Category[]>((signal) => getCategories(signal), []);
  const prompts = useResource<Prompt[]>((signal) => getPrompts(signal), []);
  const users = useResource<User[]>((signal) => getUsers(signal), []);

  const rows = useMemo<CategoryRow[]>(() => {
    const counts = new Map<number, number>();
    for (const prompt of prompts.data ?? []) {
      if (prompt.category_id === null) continue;
      counts.set(prompt.category_id, (counts.get(prompt.category_id) ?? 0) + 1);
    }
    const userName = new Map((users.data ?? []).map((user) => [user.id, user.name]));

    return (categories.data ?? []).map((category) => ({
      ...category,
      owner: userName.get(category.user_id) ?? `User ${category.user_id}`,
      prompts: counts.get(category.id) ?? 0,
    }));
  }, [categories.data, prompts.data, users.data]);

  const columns: Array<Column<CategoryRow>> = [
    {
      key: "name",
      header: "Category",
      render: (row) => (
        <span className="chip">
          <span className="chip__dot" style={row.color ? { background: row.color } : undefined} aria-hidden="true" />
          {row.name}
        </span>
      ),
      sortValue: (row) => row.name,
    },
    { key: "owner", header: "Owner", render: (row) => row.owner, sortValue: (row) => row.owner },
    {
      key: "color",
      header: "Colour",
      render: (row) => <span className="mono">{row.color ?? "—"}</span>,
      sortValue: (row) => row.color ?? "",
    },
    {
      key: "prompts",
      header: "Prompts",
      numeric: true,
      render: (row) => formatNumber(row.prompts),
      sortValue: (row) => row.prompts,
    },
  ];

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Categories</h1>
          <p className="page__subtitle">
            User-defined labels for prompts. The colour shown is the one the owner chose, not a chart colour.
          </p>
        </div>
      </header>

      <section className="sheet">
        <ResourceView
          data={categories.data}
          error={categories.error}
          isLoading={categories.isLoading}
          isRefreshing={categories.isRefreshing || prompts.isRefreshing}
          onRetry={categories.reload}
          isEmpty={(list) => list.length === 0}
          emptyTitle="No categories yet"
          emptyDetail="Seed the database with database/seed.py to populate this view."
          skeletonHeight={240}
        >
          {() => (
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(row) => String(row.id)}
              initialSort={{ key: "prompts", direction: "desc" }}
              caption="Categories"
            />
          )}
        </ResourceView>
      </section>
    </div>
  );
}
