import { useMemo, useState } from "react";
import { getCategories, getPrompts, getUsers } from "../api/endpoints";
import type { Category, Prompt, User } from "../api/types";
import { DataTable } from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { ResourceView } from "../components/States";
import { useResource } from "../hooks/useResource";
import { formatDateLong, formatNumber, parseDate, truncate } from "../lib/format";

export function PromptsPage() {
  const prompts = useResource<Prompt[]>((signal) => getPrompts(signal), []);
  const categories = useResource<Category[]>((signal) => getCategories(signal), []);
  const users = useResource<User[]>((signal) => getUsers(signal), []);
  const [search, setSearch] = useState("");

  const categoryFor = useMemo(() => {
    const byId = new Map((categories.data ?? []).map((category) => [category.id, category]));
    return (id: number | null) => (id === null ? undefined : byId.get(id));
  }, [categories.data]);

  const userName = useMemo(() => {
    const byId = new Map((users.data ?? []).map((user) => [user.id, user.name]));
    return (id: number) => byId.get(id) ?? `User ${id}`;
  }, [users.data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = prompts.data ?? [];
    if (!query) return rows;
    return rows.filter((prompt) =>
      [prompt.prompt_text, prompt.response_text ?? "", prompt.model ?? "", prompt.platform ?? ""].some((field) =>
        field.toLowerCase().includes(query),
      ),
    );
  }, [prompts.data, search]);

  const columns: Array<Column<Prompt>> = [
    {
      key: "created",
      header: "Created",
      render: (row) => formatDateLong(row.created_at),
      sortValue: (row) => parseDate(row.created_at)?.getTime() ?? 0,
    },
    { key: "user", header: "User", render: (row) => userName(row.user_id), sortValue: (row) => userName(row.user_id) },
    {
      key: "category",
      header: "Category",
      render: (row) => {
        const category = categoryFor(row.category_id);
        return (
          <span className="chip">
            <span
              className="chip__dot"
              style={category?.color ? { background: category.color } : undefined}
              aria-hidden="true"
            />
            {category?.name ?? "Uncategorised"}
          </span>
        );
      },
      sortValue: (row) => categoryFor(row.category_id)?.name ?? "Uncategorised",
    },
    {
      key: "model",
      header: "Model",
      render: (row) => <span className="mono">{row.model ?? "—"}</span>,
      sortValue: (row) => row.model ?? "",
    },
    { key: "platform", header: "Platform", render: (row) => row.platform ?? "—", sortValue: (row) => row.platform ?? "" },
    { key: "prompt", header: "Prompt", wrap: true, render: (row) => truncate(row.prompt_text, 160) },
    {
      key: "response",
      header: "Response",
      wrap: true,
      render: (row) => (row.response_text ? truncate(row.response_text, 160) : "—"),
    },
  ];

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Prompts</h1>
          <p className="page__subtitle">Every prompt captured by the platform, with its model, category and response.</p>
        </div>
      </header>

      <section className="sheet">
        <div className="table-toolbar">
          <input
            className="input"
            type="search"
            placeholder="Search prompt or response text…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search prompts"
          />
          <span className="rowcount">
            {formatNumber(filtered.length)} of {formatNumber(prompts.data?.length ?? 0)} prompts
          </span>
        </div>

        <ResourceView
          data={prompts.data}
          error={prompts.error}
          isLoading={prompts.isLoading}
          isRefreshing={prompts.isRefreshing}
          onRetry={prompts.reload}
          isEmpty={(rows) => rows.length === 0}
          emptyTitle="No prompts yet"
          emptyDetail="Seed the database with database/seed.py to populate this view."
          skeletonHeight={320}
        >
          {() => (
            <DataTable
              rows={filtered}
              columns={columns}
              rowKey={(row) => String(row.id)}
              initialSort={{ key: "created", direction: "desc" }}
              emptyMessage={
                <>
                  <p className="state__title">Nothing matches “{search.trim()}”</p>
                  <p className="state__detail">
                    This box searches prompt and response text, plus model and platform names.
                  </p>
                  <button type="button" className="button" onClick={() => setSearch("")}>
                    Clear search
                  </button>
                </>
              }
              caption="Prompts"
            />
          )}
        </ResourceView>
      </section>
    </div>
  );
}
