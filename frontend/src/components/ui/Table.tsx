import { type ReactNode, useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => ReactNode;
}

type SortDirection = "asc" | "desc";

interface SortState {
  key: string;
  direction: SortDirection;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  onSort?: (key: string, direction: SortDirection) => void;
  className?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onSort,
  className = "",
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedData = useMemo(() => {
    if (!sort || onSort) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort, onSort]);

  function handleSort(key: string) {
    const newDirection: SortDirection =
      sort?.key === key && sort.direction === "asc" ? "desc" : "asc";

    setSort({ key, direction: newDirection });
    onSort?.(key, newDirection);
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500
                  ${col.sortable ? "cursor-pointer select-none hover:text-neutral-700" : ""}
                  ${col.className ?? ""}
                `}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && <SortIndicator active={sort?.key === col.key} direction={sort?.key === col.key ? sort.direction : undefined} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sortedData.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="transition-colors duration-100 hover:bg-neutral-50"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-neutral-700 ${col.className ?? ""}`}
                >
                  {col.render
                    ? col.render(row)
                    : (row[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction?: SortDirection;
}) {
  return (
    <svg className={`h-3.5 w-3.5 ${active ? "text-neutral-700" : "text-neutral-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {direction === "desc" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      )}
    </svg>
  );
}
