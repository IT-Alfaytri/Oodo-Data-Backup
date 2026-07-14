"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsBar } from "@/components/shared/stats-bar";
import { SearchToolbar } from "@/components/shared/search-toolbar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { RawDataViewer } from "@/components/shared/raw-data-viewer";
import { formatDate, PAGE_SIZE } from "@/lib/constants";
import type { StockQuant } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const COLUMNS: Column<StockQuant>[] = [
  { key: "product_id", label: "Product" },
  { key: "location_id", label: "Location" },
  { key: "quantity", label: "Quantity", className: "text-right" },
  {
    key: "reserved_quantity",
    label: "Reserved",
    className: "text-right",
  },
  {
    key: "inventory_quantity",
    label: "Inventory Qty",
    className: "text-right",
  },
  { key: "lot_id", label: "Lot/Serial" },
];

const EXPORT_COLUMNS = [
  "id",
  "product_id",
  "location_id",
  "quantity",
  "reserved_quantity",
  "inventory_quantity",
  "lot_id",
];

export function InventoryClient({ totalCount }: { totalCount: number }) {
  const supabase = createClient();
  const [quants, setQuants] = useState<StockQuant[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchQuants = useCallback(async () => {
    let query = supabase
      .from("stock_quants")
      .select("*", { count: "exact" })
      .order("product_id");

    if (search)
      query = query.or(
        `product_id.ilike.%${search}%,location_id.ilike.%${search}%`
      );

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setQuants((data as StockQuant[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search]);

  useEffect(() => {
    fetchQuants();
  }, [fetchQuants]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Quants", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
          ]}
        />
      </div>

      <SearchToolbar search={search} onSearch={setSearch}>
        <ExportDialog
          tableName="stock_quants"
          dateColumn="id"
          columns={EXPORT_COLUMNS}
          fileName="inventory"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        <DataTable
          columns={COLUMNS}
          data={quants}
          expandedId={expandedId}
          onRowClick={(id) => setExpandedId(expandedId === id ? null : id)}
          renderExpanded={(quant) => (
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(
                  [
                    ["In Date", formatDate(quant.in_date)],
                    ["Company", quant.company_id],
                  ] as [string, unknown][]
                ).map(([label, value]) => (
                  <div key={String(label)}>
                    <div className="text-[10px] text-gray-400 uppercase">
                      {String(label)}
                    </div>
                    <div className="text-sm text-gray-700">
                      {String(value ?? "—")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnnotationTarget(quant.id)}
                  className="text-gray-400 hover:text-[#1a1a2e] p-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {quant.raw_data && (
                  <RawDataViewer
                    data={quant.raw_data}
                    title={quant.product_id}
                  />
                )}
              </div>
            </div>
          )}
        />

        {totalPages > 1 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalCount={filteredCount}
            onPageChange={setPage}
          />
        )}
      </div>

      <AnnotationPanel
        tableName="stock_quants"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
