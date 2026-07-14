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
import { StatusBadge } from "@/components/shared/status-badge";
import { formatAmount, PAGE_SIZE } from "@/lib/constants";
import type { ProductTemplate } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Storable", value: "product" },
  { label: "Service", value: "service" },
  { label: "Consumable", value: "consu" },
];

const COLUMNS: Column<ProductTemplate>[] = [
  { key: "name", label: "Product Name" },
  {
    key: "type",
    label: "Type",
    render: (r) => <StatusBadge status={r.type} />,
  },
  { key: "categ_id", label: "Category" },
  {
    key: "list_price",
    label: "Sale Price",
    render: (r) => formatAmount(r.list_price),
    className: "text-right",
  },
  {
    key: "standard_price",
    label: "Cost",
    render: (r) => formatAmount(r.standard_price),
    className: "text-right",
  },
  { key: "qty_available", label: "On Hand", className: "text-right" },
  { key: "uom_id", label: "UoM" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "type",
  "categ_id",
  "list_price",
  "standard_price",
  "qty_available",
  "uom_id",
  "tracking",
  "cost_method",
];

export function ProductsClient({ totalCount }: { totalCount: number }) {
  const supabase = createClient();
  const [products, setProducts] = useState<ProductTemplate[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    let query = supabase
      .from("product_templates")
      .select("*", { count: "exact" })
      .order("name");

    if (search) query = query.ilike("name", `%${search}%`);
    if (typeFilter) query = query.eq("type", typeFilter);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setProducts((data as ProductTemplate[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, typeFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Products", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
          ]}
        />
      </div>

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        filters={FILTERS}
        activeFilter={typeFilter}
        onFilter={setTypeFilter}
      >
        <ExportDialog
          tableName="product_templates"
          dateColumn="id"
          columns={EXPORT_COLUMNS}
          fileName="products"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        <DataTable
          columns={COLUMNS}
          data={products}
          expandedId={expandedId}
          onRowClick={(id) => setExpandedId(expandedId === id ? null : id)}
          renderExpanded={(product) => (
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(
                  [
                    ["Tracking", product.tracking],
                    ["Cost Method", product.cost_method],
                    ["Valuation", product.valuation],
                    ["Virtual Available", product.virtual_available],
                    ["Can Sell", product.sale_ok ? "Yes" : "No"],
                    ["Can Purchase", product.purchase_ok ? "Yes" : "No"],
                    ["Active", product.active ? "Yes" : "No"],
                    ["Company", product.company_id],
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
                  onClick={() => setAnnotationTarget(product.id)}
                  className="text-gray-400 hover:text-[#1a1a2e] p-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {product.raw_data && (
                  <RawDataViewer
                    data={product.raw_data}
                    title={product.name}
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
        tableName="product_templates"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
