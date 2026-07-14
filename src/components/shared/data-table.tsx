"use client";

import { Fragment, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T extends { id: number }> {
  columns: Column<T>[];
  data: T[];
  expandedId: number | null;
  onRowClick: (id: number) => void;
  renderExpanded: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: number }>({
  columns,
  data,
  expandedId,
  onRowClick,
  renderExpanded,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
        });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg border border-gray-200 overflow-hidden">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                tabIndex={col.sortable !== false ? 0 : undefined}
                role={col.sortable !== false ? "button" : undefined}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                onKeyDown={(e) => {
                  if (
                    col.sortable !== false &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    handleSort(col.key);
                  }
                }}
                className={`bg-gray-100 px-3.5 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide font-semibold cursor-pointer hover:bg-gray-200 whitespace-nowrap sticky top-[52px] z-10 ${
                  col.className ?? ""
                }`}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key &&
                    (sortDir === "asc" ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <Fragment key={row.id}>
              <tr
                onClick={() => onRowClick(row.id)}
                className={`cursor-pointer transition-colors hover:bg-[#1a1a2e08] ${
                  expandedId === row.id ? "bg-[#1a1a2e08] font-semibold" : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3.5 py-2.5 border-t border-gray-100 text-[13px] text-gray-700 ${
                      col.className ?? ""
                    }`}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as Record<string, unknown>)[col.key] ?? "—"
                        )}
                  </td>
                ))}
              </tr>
              {expandedId === row.id && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="bg-gray-50 p-0 border-t border-gray-100"
                  >
                    {renderExpanded(row)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
