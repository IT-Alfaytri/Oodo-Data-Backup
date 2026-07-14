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
import { formatAmount, formatDate, PAGE_SIZE } from "@/lib/constants";
import type { Payment } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Posted", value: "posted" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancel" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
];

const COLUMNS: Column<Payment>[] = [
  { key: "name", label: "Name" },
  {
    key: "date",
    label: "Date",
    render: (r) => formatDate(r.date),
  },
  { key: "payment_type", label: "Payment Type" },
  { key: "partner_type", label: "Partner Type" },
  { key: "partner_id", label: "Partner" },
  {
    key: "amount",
    label: "Amount",
    render: (r) => formatAmount(r.amount),
    className: "text-right",
  },
  { key: "journal_id", label: "Journal" },
  {
    key: "state",
    label: "Status",
    render: (r) => <StatusBadge status={r.state} />,
  },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "date",
  "state",
  "payment_type",
  "partner_type",
  "partner_id",
  "amount",
  "journal_id",
  "ref",
];

const STATE_VALUES = ["posted", "draft", "cancel"];

export function AccountingClient({ totalCount }: { totalCount: number }) {
  const supabase = createClient();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchPayments = useCallback(async () => {
    let query = supabase
      .from("payments")
      .select("*", { count: "exact" })
      .order("date", { ascending: false });

    if (search)
      query = query.or(
        `name.ilike.%${search}%,partner_id.ilike.%${search}%,ref.ilike.%${search}%`
      );

    if (filter) {
      if (STATE_VALUES.includes(filter)) {
        query = query.eq("state", filter);
      } else {
        query = query.eq("payment_type", filter);
      }
    }

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setPayments((data as Payment[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Payments", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
          ]}
        />
      </div>

      <SearchToolbar
        search={search}
        onSearch={setSearch}
        filters={FILTERS}
        activeFilter={filter}
        onFilter={setFilter}
      >
        <ExportDialog
          tableName="payments"
          dateColumn="date"
          columns={EXPORT_COLUMNS}
          fileName="payments"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        <DataTable
          columns={COLUMNS}
          data={payments}
          expandedId={expandedId}
          onRowClick={(id) => setExpandedId(expandedId === id ? null : id)}
          renderExpanded={(payment) => (
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(
                  [
                    ["Reference", payment.ref],
                    ["Currency", payment.currency_id],
                    ["Company", payment.company_id],
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
                  onClick={() => setAnnotationTarget(payment.id)}
                  className="text-gray-400 hover:text-[#1a1a2e] p-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {payment.raw_data && (
                  <RawDataViewer
                    data={payment.raw_data}
                    title={payment.name}
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
        tableName="payments"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
