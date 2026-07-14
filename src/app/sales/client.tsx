"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsBar } from "@/components/shared/stats-bar";
import { SearchToolbar } from "@/components/shared/search-toolbar";
import { AccordionCard } from "@/components/shared/accordion-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { RawDataViewer } from "@/components/shared/raw-data-viewer";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatAmount, formatDate, PAGE_SIZE } from "@/lib/constants";
import type { SaleOrder, SaleOrderLine } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Draft", value: "draft" },
  { label: "Sales Order", value: "sale" },
  { label: "Done", value: "done" },
  { label: "Cancelled", value: "cancel" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "state",
  "partner_id",
  "date_order",
  "amount_untaxed",
  "amount_tax",
  "amount_total",
  "invoice_status",
  "user_id",
  "warehouse_id",
  "margin",
];

export function SalesClient({
  totalCount,
  totalAmount,
}: {
  totalCount: number;
  totalAmount: number;
}) {
  const supabase = createClient();
  const [orders, setOrders] = useState<SaleOrder[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, SaleOrderLine[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from("sale_orders")
      .select("*", { count: "exact" })
      .order("date_order", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,partner_id.ilike.%${search}%`
      );
    }
    if (statusFilter) {
      query = query.eq("state", statusFilter);
    }

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setOrders((data as SaleOrder[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function loadLines(orderId: number) {
    if (lines[orderId]) return;
    const { data } = await supabase
      .from("sale_order_lines")
      .select("*")
      .eq("order_id", orderId)
      .order("id");
    if (data)
      setLines((prev) => ({ ...prev, [orderId]: data as SaleOrderLine[] }));
  }

  function handleToggle(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLines(id);
    }
  }

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Orders", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
            { label: "Total Value", value: formatAmount(totalAmount) },
          ]}
        />
      </div>

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        filters={FILTERS}
        activeFilter={statusFilter}
        onFilter={setStatusFilter}
      >
        <ExportDialog
          tableName="sale_orders"
          dateColumn="date_order"
          columns={EXPORT_COLUMNS}
          fileName="sales_orders"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-base">
            No records found
          </div>
        ) : (
          orders.map((order) => (
            <AccordionCard
              key={order.id}
              id={order.id}
              name={order.name}
              partner={order.partner_id}
              date={order.date_order}
              amount={order.amount_total}
              status={order.state}
              isOpen={expandedId === order.id}
              onToggle={() => handleToggle(order.id)}
              extraMeta={[
                { label: "Warehouse", value: order.warehouse_id ?? "" },
              ]}
            >
              <div className="px-5 py-3 bg-gray-50 flex gap-6 flex-wrap border-b border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Salesperson
                  </div>
                  <div className="text-sm text-gray-700">
                    {order.user_id ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Invoice Status
                  </div>
                  <div className="text-sm">
                    <StatusBadge status={order.invoice_status} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Margin
                  </div>
                  <div className="text-sm text-gray-700">
                    {order.margin_percent != null
                      ? `${order.margin_percent.toFixed(1)}%`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    LPO Ref
                  </div>
                  <div className="text-sm text-gray-700">
                    {order.x_studio_lpo_reference ?? "—"}
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotationTarget(order.id);
                    }}
                    className="text-gray-400 hover:text-[#1a1a2e] p-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  {order.raw_data && (
                    <RawDataViewer data={order.raw_data} title={order.name} />
                  )}
                </div>
              </div>

              {lines[order.id] ? (
                <>
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Product
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Qty
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Price
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Disc %
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Subtotal
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Delivered
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Invoiced
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines[order.id].map((line) => (
                        <tr key={line.id} className="hover:bg-[#1a1a2e08]">
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.product_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.product_uom_qty}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {formatAmount(line.price_unit)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.discount ?? 0}%
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right font-semibold">
                            {formatAmount(line.price_subtotal)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.qty_delivered}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.qty_invoiced}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                    {lines[order.id].length} line(s)
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">
                  Loading lines...
                </div>
              )}
            </AccordionCard>
          ))
        )}

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
        tableName="sale_orders"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
