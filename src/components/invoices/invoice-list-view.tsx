"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { StatsBar } from "@/components/shared/stats-bar";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChatterPanel } from "@/components/shared/chatter-panel";
import { Input } from "@/components/ui/input";
import { formatAmount, formatDate, PAGE_SIZE } from "@/lib/constants";
import type { Invoice, InvoiceLine } from "@/lib/types";
import { Search, ChevronRight, MessageSquare } from "lucide-react";

const STATE_FILTERS = [
  { label: "Posted", value: "posted" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancel" },
];

const PAYMENT_FILTERS = [
  { label: "Paid", value: "paid" },
  { label: "Not Paid", value: "not_paid" },
  { label: "Partial", value: "partial" },
  { label: "In Payment", value: "in_payment" },
  { label: "Reversed", value: "reversed" },
];

const EXPORT_COLUMNS = [
  "id", "name", "state", "partner_id", "invoice_date", "invoice_date_due",
  "amount_untaxed", "amount_tax", "amount_total", "amount_residual",
  "payment_state", "invoice_origin", "journal_id",
];

interface Props {
  /** account.move.move_type filter — a single value or a set (credit notes). */
  moveType: string | string[];
  title: string;
  partnerLabel: string; // "Customer" | "Vendor" | "Partner"
  totalLabel: string; // "Total Invoices" | ...
  exportFileName: string;
}

export function InvoiceListView({
  moveType,
  partnerLabel,
  totalLabel,
  exportFileName,
}: Props) {
  const supabase = createClient();
  const { companyFilter } = useCompany();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, InvoiceLine[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const applyType = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q: any) =>
      Array.isArray(moveType) ? q.in("move_type", moveType) : q.eq("move_type", moveType),
    [moveType]
  );

  const fetchStats = useCallback(async () => {
    let query = applyType(
      supabase.from("invoices").select("amount_total.sum(), id.count()")
    );
    if (companyFilter) query = query.eq("company_id", companyFilter);
    const { data } = await query.single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTotalCount((data as any).count ?? 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTotalAmount((data as any).sum ?? 0);
    }
  }, [supabase, companyFilter, applyType]);

  const fetchInvoices = useCallback(async () => {
    let query = applyType(
      supabase.from("invoices").select("*", { count: "exact" })
    ).order("date", { ascending: false });

    if (companyFilter) query = query.eq("company_id", companyFilter);
    if (search) query = query.or(`name.ilike.%${search}%,partner_id.ilike.%${search}%`);
    if (stateFilter) query = query.eq("state", stateFilter);
    if (paymentFilter) query = query.eq("payment_state", paymentFilter);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setInvoices((data as Invoice[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, stateFilter, paymentFilter, companyFilter, applyType]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, paymentFilter, companyFilter]);

  async function loadLines(id: number) {
    if (lines[id]) return;
    const { data } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("move_id", id)
      .order("id");
    if (data) setLines((prev) => ({ ...prev, [id]: data as InvoiceLine[] }));
  }

  function toggle(id: number) {
    if (expandedId === id) setExpandedId(null);
    else {
      setExpandedId(id);
      loadLines(id);
    }
  }

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  const th =
    "px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 whitespace-nowrap";
  const thR = th + " text-right";

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: totalLabel, value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
            { label: "Total Value", value: formatAmount(totalAmount) },
          ]}
        />
      </div>

      {/* Toolbar: search + Status filter + Payment filter + export */}
      <div className="bg-white px-8 py-3 border-b border-gray-200 sticky top-0 z-30 space-y-2.5">
        <div className="flex gap-2.5 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${partnerLabel.toLowerCase()} / number…`}
              className="pl-9"
            />
          </div>
          <FilterPills
            label="Status"
            options={STATE_FILTERS}
            active={stateFilter}
            onChange={setStateFilter}
          />
          <ExportDialog
            tableName="invoices"
            dateColumn="date"
            columns={EXPORT_COLUMNS}
            filters={Array.isArray(moveType) ? {} : { move_type: moveType }}
            fileName={exportFileName}
          />
        </div>
        <FilterPills
          label="Payment"
          options={PAYMENT_FILTERS}
          active={paymentFilter}
          onChange={setPaymentFilter}
        />
      </div>

      {/* Odoo-style list table */}
      <div className="px-8 py-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th + " w-8"}></th>
                  <th className={th}>Number</th>
                  <th className={th}>{partnerLabel}</th>
                  <th className={th}>Invoice Date</th>
                  <th className={th + " hidden lg:table-cell"}>Due Date</th>
                  <th className={th + " hidden xl:table-cell"}>Source</th>
                  <th className={thR}>Total</th>
                  <th className={thR}>Amount Due</th>
                  <th className={th + " text-center"}>Payment</th>
                  <th className={th + " text-center"}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-gray-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const open = expandedId === inv.id;
                    return (
                      <Fragment key={inv.id}>
                        <tr
                          onClick={() => toggle(inv.id)}
                          className={`cursor-pointer border-t border-gray-100 hover:bg-[#1a1a2e08] ${
                            open ? "bg-[#1a1a2e0a]" : ""
                          }`}
                        >
                          <td className="px-3 py-2.5 text-gray-400">
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
                            />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[#1a1a2e] whitespace-nowrap">
                            {inv.name}
                          </td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[240px] truncate">
                            {inv.partner_id ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {formatDate(inv.invoice_date)}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap hidden lg:table-cell">
                            {formatDate(inv.invoice_date_due)}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap hidden xl:table-cell">
                            {inv.invoice_origin ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-800 tabular-nums whitespace-nowrap">
                            {formatAmount(inv.amount_total)}
                          </td>
                          <td
                            className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap font-medium ${
                              (inv.amount_residual ?? 0) > 0 ? "text-orange-600" : "text-gray-400"
                            }`}
                          >
                            {formatAmount(inv.amount_residual)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge status={inv.payment_state} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge status={inv.state} />
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${inv.id}-detail`} className="bg-gray-50/50">
                            <td colSpan={10} className="p-0 border-t border-gray-100">
                              <InvoiceDetail
                                invoice={inv}
                                lines={lines[inv.id]}
                                onAnnotate={() => setAnnotationTarget(inv.id)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

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

function FilterPills({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 items-center flex-wrap">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(active === o.value ? "" : o.value)}
          className={`px-3 py-1 border rounded-full text-xs font-semibold transition-colors ${
            active === o.value
              ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
              : "bg-white text-gray-600 border-gray-300 hover:border-[#1a1a2e]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function InvoiceDetail({
  invoice,
  lines,
  onAnnotate,
}: {
  invoice: Invoice;
  lines: InvoiceLine[] | undefined;
  onAnnotate: () => void;
}) {
  const meta = [
    ["Source Document", invoice.invoice_origin ?? "—"],
    ["Due Date", formatDate(invoice.invoice_date_due)],
    ["Journal", invoice.journal_id ?? "—"],
    ["Untaxed", formatAmount(invoice.amount_untaxed)],
    ["Tax", formatAmount(invoice.amount_tax)],
    ["Amount Due", formatAmount(invoice.amount_residual)],
  ] as const;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="px-5 py-3 flex gap-6 flex-wrap border-b border-gray-100">
        {meta.map(([k, v]) => (
          <div key={k}>
            <div className="text-[10px] text-gray-400 uppercase">{k}</div>
            <div className="text-sm text-gray-700">{v}</div>
          </div>
        ))}
        <button
          onClick={onAnnotate}
          className="ml-auto text-gray-400 hover:text-[#1a1a2e] p-1 self-start"
          title="Notes"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>

      {lines ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Account", "Product", "Description", "Qty", "Price", "Disc %", "Debit", "Credit", "Balance"].map(
                    (h, i) => (
                      <th
                        key={h}
                        className={`bg-gray-100 px-3 py-2 text-[11px] text-gray-500 uppercase font-semibold ${
                          i >= 3 ? "text-right" : "text-left"
                        }`}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-[#1a1a2e08]">
                    <td className="px-3 py-2 border-t border-gray-100 text-gray-700">{line.account_id ?? "—"}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-gray-700">{line.product_id ?? "—"}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-gray-700">{line.name ?? "—"}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">{line.quantity}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">{formatAmount(line.price_unit)}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">{line.discount ?? 0}%</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">{formatAmount(line.debit)}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">{formatAmount(line.credit)}</td>
                    <td className="px-3 py-2 border-t border-gray-100 text-right font-semibold">{formatAmount(line.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            {lines.length} line(s)
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-sm text-gray-400">Loading lines…</div>
      )}
      <ChatterPanel model="account.move" resId={invoice.id} />
    </div>
  );
}
