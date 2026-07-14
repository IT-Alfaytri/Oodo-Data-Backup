"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { StatsBar } from "@/components/shared/stats-bar";
import { SearchToolbar } from "@/components/shared/search-toolbar";
import { AccordionCard } from "@/components/shared/accordion-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatAmount, formatDate, PAGE_SIZE } from "@/lib/constants";
import type { PurchaseOrder, PurchaseOrderLine } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Draft", value: "draft" },
  { label: "Purchase Order", value: "purchase" },
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
  "receipt_status",
];

export function PurchasesClient() {
  const supabase = createClient();
  const { companyFilter } = useCompany();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, PurchaseOrderLine[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    let countQuery = supabase.from("purchase_orders").select("*", { count: "exact", head: true });
    if (companyFilter) countQuery = countQuery.eq("company_id", companyFilter);
    const { count } = await countQuery;
    setTotalCount(count ?? 0);

    let sumQuery = supabase.from("purchase_orders").select("amount_total").not("amount_total", "is", null);
    if (companyFilter) sumQuery = sumQuery.eq("company_id", companyFilter);
    const { data: totalResult } = await sumQuery;
    setTotalAmount(totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0);
  }, [companyFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from("purchase_orders")
      .select("*", { count: "exact" })
      .order("date_order", { ascending: false });

    if (companyFilter) query = query.eq("company_id", companyFilter);
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
    setOrders((data as PurchaseOrder[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, statusFilter, companyFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, companyFilter]);

  async function loadLines(orderId: number) {
    if (lines[orderId]) return;
    const { data } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("order_id", orderId)
      .order("id");
    if (data)
      setLines((prev) => ({
        ...prev,
        [orderId]: data as PurchaseOrderLine[],
      }));
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
          tableName="purchase_orders"
          dateColumn="date_order"
          columns={EXPORT_COLUMNS}
          fileName="purchase_orders"
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
            >
              <div className="px-5 py-3 bg-gray-50 flex gap-6 flex-wrap border-b border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Date Approved
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatDate(order.date_approve)}
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
                    Receipt Status
                  </div>
                  <div className="text-sm">
                    <StatusBadge status={order.receipt_status} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Discount
                  </div>
                  <div className="text-sm text-gray-700">
                    {order.discount_type
                      ? `${order.discount_type}: ${formatAmount(order.discount_amount)}`
                      : "—"}
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
                          Received
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
                            {line.product_qty}
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
                            {line.qty_received}
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
        tableName="purchase_orders"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
