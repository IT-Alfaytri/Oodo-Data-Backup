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
import type { Invoice, InvoiceLine } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Posted", value: "posted" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancel" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "state",
  "partner_id",
  "invoice_date",
  "amount_untaxed",
  "amount_tax",
  "amount_total",
  "amount_residual",
  "payment_state",
  "invoice_origin",
];

export function CustomerInvoicesClient() {
  const supabase = createClient();
  const { companyFilter } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, InvoiceLine[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    let query = supabase
      .from("invoices")
      .select("amount_total.sum(), id.count()")
      .eq("move_type", "out_invoice");
    if (companyFilter) query = query.eq("company_id", companyFilter);
    const { data } = await query.single();
    if (data) {
      setTotalCount((data as any).count ?? 0);
      setTotalAmount((data as any).sum ?? 0);
    }
  }, [supabase, companyFilter]);

  const fetchInvoices = useCallback(async () => {
    let query = supabase
      .from("invoices")
      .select("*", { count: "exact" })
      .eq("move_type", "out_invoice")
      .order("date", { ascending: false });

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
    setInvoices((data as Invoice[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, statusFilter, companyFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, companyFilter]);

  async function loadLines(invoiceId: number) {
    if (lines[invoiceId]) return;
    const { data } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("move_id", invoiceId)
      .order("id");
    if (data)
      setLines((prev) => ({
        ...prev,
        [invoiceId]: data as InvoiceLine[],
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
            { label: "Total Invoices", value: totalCount.toLocaleString() },
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
          tableName="invoices"
          dateColumn="date"
          columns={EXPORT_COLUMNS}
          filters={{ move_type: "out_invoice" }}
          fileName="customer_invoices"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        {invoices.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-base">
            No records found
          </div>
        ) : (
          invoices.map((invoice) => (
            <AccordionCard
              key={invoice.id}
              id={invoice.id}
              name={invoice.name}
              partner={invoice.partner_id}
              date={invoice.invoice_date}
              amount={invoice.amount_total}
              status={invoice.state}
              isOpen={expandedId === invoice.id}
              onToggle={() => handleToggle(invoice.id)}
            >
              <div className="px-5 py-3 bg-gray-50 flex gap-6 flex-wrap border-b border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Source Document
                  </div>
                  <div className="text-sm text-gray-700">
                    {invoice.invoice_origin ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Due Date
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatDate(invoice.invoice_date_due)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Journal
                  </div>
                  <div className="text-sm text-gray-700">
                    {invoice.journal_id ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Untaxed
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatAmount(invoice.amount_untaxed)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Tax
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatAmount(invoice.amount_tax)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Amount Due
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatAmount(invoice.amount_residual)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Payment
                  </div>
                  <div className="text-sm">
                    <StatusBadge status={invoice.payment_state} />
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotationTarget(invoice.id);
                    }}
                    className="text-gray-400 hover:text-[#1a1a2e] p-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {lines[invoice.id] ? (
                <>
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Account
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Product
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Description
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
                          Debit
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Credit
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines[invoice.id].map((line) => (
                        <tr key={line.id} className="hover:bg-[#1a1a2e08]">
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.account_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.product_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.name ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.quantity}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {formatAmount(line.price_unit)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {line.discount ?? 0}%
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {formatAmount(line.debit)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {formatAmount(line.credit)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right font-semibold">
                            {formatAmount(line.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                    {lines[invoice.id].length} line(s)
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
        tableName="invoices"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
