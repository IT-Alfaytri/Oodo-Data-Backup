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
import { formatAmount, PAGE_SIZE } from "@/lib/constants";
import type { Contact } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Company", value: "company" },
  { label: "Individual", value: "individual" },
];

const COLUMNS: Column<Contact>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "country_id", label: "Country" },
  {
    key: "credit",
    label: "Credit",
    render: (r) => formatAmount(r.credit),
    className: "text-right",
  },
  {
    key: "total_invoiced",
    label: "Total Invoiced",
    render: (r) => formatAmount(r.total_invoiced),
    className: "text-right",
  },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "email",
  "phone",
  "city",
  "country_id",
  "credit",
  "debit",
  "total_invoiced",
  "credit_limit",
];

export function CustomersClient({ totalCount }: { totalCount: number }) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchCustomers = useCallback(async () => {
    let query = supabase
      .from("contacts")
      .select("*", { count: "exact" })
      .gt("customer_rank", 0)
      .order("name");

    if (search)
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    if (filter === "company") query = query.eq("is_company", true);
    if (filter === "individual") query = query.eq("is_company", false);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setCustomers((data as Contact[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, filter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Customers", value: totalCount.toLocaleString() },
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
          tableName="contacts"
          dateColumn="id"
          columns={EXPORT_COLUMNS}
          fileName="customers"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        <DataTable
          columns={COLUMNS}
          data={customers}
          expandedId={expandedId}
          onRowClick={(id) => setExpandedId(expandedId === id ? null : id)}
          renderExpanded={(customer) => (
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(
                  [
                    ["Street", customer.street],
                    ["Mobile", customer.mobile],
                    ["Customer Rank", customer.customer_rank],
                    ["Supplier Rank", customer.supplier_rank],
                    ["Credit Limit", formatAmount(customer.credit_limit)],
                    ["Debit", formatAmount(customer.debit)],
                    ["Company", customer.company_id],
                    ["Active", customer.active ? "Yes" : "No"],
                    ["Parent", customer.parent_id],
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
                  onClick={() => setAnnotationTarget(customer.id)}
                  className="text-gray-400 hover:text-[#1a1a2e] p-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {customer.raw_data && (
                  <RawDataViewer
                    data={customer.raw_data}
                    title={customer.name}
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
        tableName="contacts"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
