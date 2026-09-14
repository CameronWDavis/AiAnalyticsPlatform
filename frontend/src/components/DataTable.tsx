import { useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface Column<Row> {
  key: string;
  header: string;
  /** Right-aligns and uses tabular figures. */
  numeric?: boolean;
  /** Lets the cell wrap — for prose columns like prompt text. */
  wrap?: boolean;
  render: (row: Row) => ReactNode;
  /** Returns the value to sort on. Omit to make the column unsortable. */
  sortValue?: (row: Row) => number | string;
}

interface DataTableProps<Row> {
  rows: readonly Row[];
  columns: ReadonlyArray<Column<Row>>;
  rowKey: (row: Row, index: number) => string;
  /** Column key to sort by on first render. */
  initialSort?: { key: string; direction: "asc" | "desc" };
  emptyMessage?: ReactNode;
  caption?: string;
}

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  initialSort,
  emptyMessage = "Nothing to show.",
  caption,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState(initialSort);

  const sorted = useMemo(() => {
    const column = columns.find((candidate) => candidate.key === sort?.key);
    if (!sort || !column?.sortValue) return rows;

    const direction = sort.direction === "asc" ? 1 : -1;
    const getValue = column.sortValue;

    return [...rows].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [rows, columns, sort]);

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  }

  if (rows.length === 0) {
    return <div className="state state--inline">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="table">
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  className={column.numeric ? "num" : undefined}
                  aria-sort={isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                  scope="col"
                >
                  {column.sortValue ? (
                    <button type="button" className="table__sort" onClick={() => toggleSort(column.key)}>
                      {column.header}
                      <span aria-hidden="true">{isSorted ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}</span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[column.numeric ? "num" : "", column.wrap ? "wrap" : ""].filter(Boolean).join(" ")}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
