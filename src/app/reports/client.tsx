"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateCSV, downloadCSV } from "@/lib/export";
import { Download, FileSpreadsheet, Eye, Loader2 } from "lucide-react";

interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

interface ReportConfig {
  title: string;
  description: string;
  // Fetches + shapes the data and returns it. The caller decides whether to
  // render it in-app (View) or download it (CSV) — the report itself no
  // longer touches the DOM.
  build: (
    supabase: ReturnType<typeof createClient>,
    from: string,
    to: string,
    companyFilter: string | null
  ) => Promise<ReportResult>;
}

function groupBy<T extends Record<string, unknown>>(
  rows: T[],
  key: string,
  sumKeys: string[]
): Record<string, unknown>[] {
  const groups: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    const groupKey = String(row[key] ?? "Unknown");
    if (!groups[groupKey]) {
      groups[groupKey] = { [key]: groupKey, count: 0 };
      for (const sk of sumKeys) groups[groupKey][sk] = 0;
    }
    groups[groupKey].count = (groups[groupKey].count as number) + 1;
    for (const sk of sumKeys) {
      groups[groupKey][sk] =
        (groups[groupKey][sk] as number) + (Number(row[sk]) || 0);
    }
  }
  return Object.values(groups);
}

const REPORTS: ReportConfig[] = [
  {
    title: "Sales by Customer",
    description:
      "Total sales amount grouped by customer. Useful for identifying top customers.",
    build: async (supabase, from, to, companyFilter) => {
      const columns = ["partner_id", "count", "amount_total"];
      const fileName = `sales_by_customer_${from || "all"}_${to || "all"}.csv`;
      let query = supabase
        .from("sale_orders")
        .select("partner_id, amount_total");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date_order", from);
      if (to) query = query.lte("date_order", to);
      const { data } = await query.limit(100000);
      const grouped = groupBy(
        (data ?? []) as Record<string, unknown>[],
        "partner_id",
        ["amount_total"]
      );
      grouped.sort(
        (a, b) => (b.amount_total as number) - (a.amount_total as number)
      );
      return { columns, rows: grouped, fileName };
    },
  },
  {
    title: "Product Profitability",
    description:
      "Sales order lines grouped by product with total margin analysis.",
    build: async (supabase, from, to) => {
      const columns = ["product_id", "count", "price_subtotal", "margin"];
      const fileName = `product_profitability_${from || "all"}_${
        to || "all"
      }.csv`;
      const query = supabase
        .from("sale_order_lines")
        .select("product_id, price_subtotal, margin, purchase_price");
      const { data } = await query.limit(100000);
      const grouped = groupBy(
        (data ?? []) as Record<string, unknown>[],
        "product_id",
        ["price_subtotal", "margin"]
      );
      grouped.sort((a, b) => (b.margin as number) - (a.margin as number));
      return { columns, rows: grouped, fileName };
    },
  },
  {
    title: "Vendor Spend Summary",
    description:
      "Purchase orders grouped by vendor with total spend breakdown.",
    build: async (supabase, from, to, companyFilter) => {
      const columns = ["partner_id", "count", "amount_total"];
      const fileName = `vendor_spend_${from || "all"}_${to || "all"}.csv`;
      let query = supabase
        .from("purchase_orders")
        .select("partner_id, amount_total");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date_order", from);
      if (to) query = query.lte("date_order", to);
      const { data } = await query.limit(100000);
      const grouped = groupBy(
        (data ?? []) as Record<string, unknown>[],
        "partner_id",
        ["amount_total"]
      );
      grouped.sort(
        (a, b) => (b.amount_total as number) - (a.amount_total as number)
      );
      return { columns, rows: grouped, fileName };
    },
  },
  {
    title: "Outstanding Receivables",
    description:
      "Customer invoices with remaining balance (amount_residual > 0).",
    build: async (supabase, from, to, companyFilter) => {
      const columns = [
        "name",
        "partner_id",
        "invoice_date",
        "amount_total",
        "amount_residual",
        "payment_state",
      ];
      const fileName = `outstanding_receivables_${from || "all"}_${
        to || "all"
      }.csv`;
      let query = supabase
        .from("invoices")
        .select(columns.join(","))
        .eq("move_type", "out_invoice")
        .gt("amount_residual", 0);
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data } = await query
        .order("amount_residual", { ascending: false })
        .limit(100000);
      return {
        columns,
        rows: (data ?? []) as unknown as Record<string, unknown>[],
        fileName,
      };
    },
  },
  {
    title: "Outstanding Payables",
    description: "Vendor bills with remaining balance (amount_residual > 0).",
    build: async (supabase, from, to, companyFilter) => {
      const columns = [
        "name",
        "partner_id",
        "invoice_date",
        "amount_total",
        "amount_residual",
        "payment_state",
      ];
      const fileName = `outstanding_payables_${from || "all"}_${
        to || "all"
      }.csv`;
      let query = supabase
        .from("invoices")
        .select(columns.join(","))
        .eq("move_type", "in_invoice")
        .gt("amount_residual", 0);
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data } = await query
        .order("amount_residual", { ascending: false })
        .limit(100000);
      return {
        columns,
        rows: (data ?? []) as unknown as Record<string, unknown>[],
        fileName,
      };
    },
  },
  {
    title: "Inventory Summary",
    description: "Current stock quantities by product and location.",
    build: async (supabase, _from, _to, companyFilter) => {
      const columns = [
        "product_id",
        "location_id",
        "quantity",
        "reserved_quantity",
      ];
      let query = supabase
        .from("stock_quants")
        .select(columns.join(","))
        .gt("quantity", 0)
        .order("product_id");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      const { data } = await query.limit(100000);
      return {
        columns,
        rows: (data ?? []) as unknown as Record<string, unknown>[],
        fileName: "inventory_summary.csv",
      };
    },
  },
];

// ---- Preview helpers -------------------------------------------------------

const PREVIEW_LIMIT = 500;

const COLUMN_LABELS: Record<string, string> = {
  partner_id: "Partner",
  product_id: "Product",
  location_id: "Location",
  amount_total: "Total",
  amount_residual: "Balance",
  price_subtotal: "Subtotal",
  invoice_date: "Date",
  payment_state: "Payment",
  reserved_quantity: "Reserved",
  quantity: "Qty",
  margin: "Margin",
  count: "Orders",
  name: "Number",
};

function columnLabel(c: string): string {
  return (
    COLUMN_LABELS[c] ??
    c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

// PostgREST can hand back `numeric` columns (invoice amounts) as strings to
// preserve precision, so treat numeric-looking strings as numbers too.
function isNumericValue(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim() !== "") return !Number.isNaN(Number(v));
  return false;
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (isNumericValue(v)) {
    const n = Number(v);
    return Number.isInteger(n)
      ? n.toLocaleString("en-US")
      : n.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }
  return String(v);
}

function ReportViewer({
  title,
  result,
  open,
  onOpenChange,
}: {
  title: string;
  result: ReportResult | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!result) return null;
  const { columns, rows, fileName } = result;
  // A column is numeric only if it has at least one numeric value and no
  // non-empty non-numeric value (so invoice numbers / dates stay left-aligned).
  const numericCols = new Set(
    columns.filter(
      (c) =>
        rows.some((r) => isNumericValue(r[c])) &&
        rows.every((r) => {
          const v = r[c];
          return v === null || v === undefined || v === "" || isNumericValue(v);
        })
    )
  );
  const preview = rows.slice(0, PREVIEW_LIMIT);
  const truncated = rows.length > PREVIEW_LIMIT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="leading-snug pr-8">{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-500">
            {rows.length.toLocaleString()} row
            {rows.length === 1 ? "" : "s"}
            {truncated && (
              <span className="text-gray-400">
                {" "}
                · previewing first {PREVIEW_LIMIT.toLocaleString()}
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => downloadCSV(generateCSV(rows, columns), fileName)}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download CSV
          </Button>
        </div>

        <div className="mt-3 max-h-[60vh] overflow-auto rounded-lg border border-gray-100">
          {rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">
              No data for this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50/95 backdrop-blur">
                <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                  {columns.map((c) => (
                    <th
                      key={c}
                      className={`px-3 py-2 font-medium whitespace-nowrap ${
                        numericCols.has(c) ? "text-right" : "text-left"
                      }`}
                    >
                      {columnLabel(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    {columns.map((c) => (
                      <td
                        key={c}
                        className={`px-3 py-2 ${
                          numericCols.has(c)
                            ? "text-right tabular-nums text-gray-700"
                            : "text-gray-600"
                        }`}
                      >
                        {formatCell(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportCard({
  report,
  companyFilter,
}: {
  report: ReportConfig;
  companyFilter: string | null;
}) {
  const supabase = createClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [open, setOpen] = useState(false);

  async function handleView() {
    setViewing(true);
    try {
      const r = await report.build(supabase, from, to, companyFilter);
      setResult(r);
      setOpen(true);
    } finally {
      setViewing(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const r = await report.build(supabase, from, to, companyFilter);
      if (r.rows.length > 0) {
        downloadCSV(generateCSV(r.rows, r.columns), r.fileName);
      }
    } finally {
      setDownloading(false);
    }
  }

  const busy = viewing || downloading;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <FileSpreadsheet className="h-5 w-5 text-[#1a1a2e] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[#1a1a2e]">{report.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3 mt-auto">
        <div>
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleView}
          disabled={busy}
          size="sm"
          className="w-full"
        >
          {viewing ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 mr-1.5" />
          )}
          {viewing ? "Loading…" : "View"}
        </Button>
        <Button
          onClick={handleDownload}
          disabled={busy}
          size="sm"
          variant="outline"
          className="w-full"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          {downloading ? "…" : "CSV"}
        </Button>
      </div>

      <ReportViewer
        title={report.title}
        result={result}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

export function ReportsClient() {
  const { companyFilter } = useCompany();

  return (
    <div className="px-8 py-6">
      <p className="text-sm text-gray-500 mb-6">
        Pre-built reports for common data analysis tasks. Set a date range, then
        preview in the browser or download as CSV.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <ReportCard
            key={report.title}
            report={report}
            companyFilter={companyFilter}
          />
        ))}
      </div>
    </div>
  );
}
