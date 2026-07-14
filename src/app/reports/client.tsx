"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateCSV, downloadCSV } from "@/lib/export";
import { Download, FileSpreadsheet } from "lucide-react";

interface ReportConfig {
  title: string;
  description: string;
  run: (
    supabase: ReturnType<typeof createClient>,
    from: string,
    to: string,
    companyFilter: string | null
  ) => Promise<void>;
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
    run: async (supabase, from, to, companyFilter) => {
      let query = supabase
        .from("sale_orders")
        .select("partner_id, amount_total");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date_order", from);
      if (to) query = query.lte("date_order", to);
      const { data } = await query.limit(100000);
      if (!data?.length) return;
      const grouped = groupBy(
        data as Record<string, unknown>[],
        "partner_id",
        ["amount_total"]
      );
      grouped.sort(
        (a, b) => (b.amount_total as number) - (a.amount_total as number)
      );
      const csv = generateCSV(grouped, [
        "partner_id",
        "count",
        "amount_total",
      ]);
      downloadCSV(csv, `sales_by_customer_${from || "all"}_${to || "all"}.csv`);
    },
  },
  {
    title: "Product Profitability",
    description:
      "Sales order lines grouped by product with total margin analysis.",
    run: async (supabase, from, to, _companyFilter) => {
      let query = supabase
        .from("sale_order_lines")
        .select("product_id, price_subtotal, margin, purchase_price");
      if (from || to) {
        const orderQuery = supabase.from("sale_orders").select("id");
        if (from) orderQuery.gte("date_order", from);
        if (to) orderQuery.lte("date_order", to);
      }
      const { data } = await query.limit(100000);
      if (!data?.length) return;
      const grouped = groupBy(
        data as Record<string, unknown>[],
        "product_id",
        ["price_subtotal", "margin"]
      );
      grouped.sort((a, b) => (b.margin as number) - (a.margin as number));
      const csv = generateCSV(grouped, [
        "product_id",
        "count",
        "price_subtotal",
        "margin",
      ]);
      downloadCSV(
        csv,
        `product_profitability_${from || "all"}_${to || "all"}.csv`
      );
    },
  },
  {
    title: "Vendor Spend Summary",
    description:
      "Purchase orders grouped by vendor with total spend breakdown.",
    run: async (supabase, from, to, companyFilter) => {
      let query = supabase
        .from("purchase_orders")
        .select("partner_id, amount_total");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date_order", from);
      if (to) query = query.lte("date_order", to);
      const { data } = await query.limit(100000);
      if (!data?.length) return;
      const grouped = groupBy(
        data as Record<string, unknown>[],
        "partner_id",
        ["amount_total"]
      );
      grouped.sort(
        (a, b) => (b.amount_total as number) - (a.amount_total as number)
      );
      const csv = generateCSV(grouped, [
        "partner_id",
        "count",
        "amount_total",
      ]);
      downloadCSV(
        csv,
        `vendor_spend_${from || "all"}_${to || "all"}.csv`
      );
    },
  },
  {
    title: "Outstanding Receivables",
    description:
      "Customer invoices with remaining balance (amount_residual > 0).",
    run: async (supabase, from, to, companyFilter) => {
      let query = supabase
        .from("invoices")
        .select(
          "name, partner_id, invoice_date, amount_total, amount_residual, payment_state"
        )
        .eq("move_type", "out_invoice")
        .gt("amount_residual", 0);
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data } = await query
        .order("amount_residual", { ascending: false })
        .limit(100000);
      if (!data?.length) return;
      const csv = generateCSV(data as Record<string, unknown>[], [
        "name",
        "partner_id",
        "invoice_date",
        "amount_total",
        "amount_residual",
        "payment_state",
      ]);
      downloadCSV(
        csv,
        `outstanding_receivables_${from || "all"}_${to || "all"}.csv`
      );
    },
  },
  {
    title: "Outstanding Payables",
    description:
      "Vendor bills with remaining balance (amount_residual > 0).",
    run: async (supabase, from, to, companyFilter) => {
      let query = supabase
        .from("invoices")
        .select(
          "name, partner_id, invoice_date, amount_total, amount_residual, payment_state"
        )
        .eq("move_type", "in_invoice")
        .gt("amount_residual", 0);
      if (companyFilter) query = query.eq("company_id", companyFilter);
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      const { data } = await query
        .order("amount_residual", { ascending: false })
        .limit(100000);
      if (!data?.length) return;
      const csv = generateCSV(data as Record<string, unknown>[], [
        "name",
        "partner_id",
        "invoice_date",
        "amount_total",
        "amount_residual",
        "payment_state",
      ]);
      downloadCSV(
        csv,
        `outstanding_payables_${from || "all"}_${to || "all"}.csv`
      );
    },
  },
  {
    title: "Inventory Summary",
    description:
      "Current stock quantities by product and location.",
    run: async (supabase, _from, _to, companyFilter) => {
      let query = supabase
        .from("stock_quants")
        .select("product_id, location_id, quantity, reserved_quantity")
        .gt("quantity", 0)
        .order("product_id");
      if (companyFilter) query = query.eq("company_id", companyFilter);
      const { data } = await query.limit(100000);
      if (!data?.length) return;
      const csv = generateCSV(data as Record<string, unknown>[], [
        "product_id",
        "location_id",
        "quantity",
        "reserved_quantity",
      ]);
      downloadCSV(csv, "inventory_summary.csv");
    },
  },
];

function ReportCard({ report, companyFilter }: { report: ReportConfig; companyFilter: string | null }) {
  const supabase = createClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    await report.run(supabase, from, to, companyFilter);
    setRunning(false);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-3">
        <FileSpreadsheet className="h-5 w-5 text-[#1a1a2e] flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-[#1a1a2e]">{report.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{report.description}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
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
      <Button
        onClick={handleRun}
        disabled={running}
        size="sm"
        className="w-full"
      >
        <Download className="h-4 w-4 mr-1.5" />
        {running ? "Generating..." : "Download CSV"}
      </Button>
    </div>
  );
}

export function ReportsClient() {
  const { companyFilter } = useCompany();

  return (
    <div className="px-8 py-6">
      <p className="text-sm text-gray-500 mb-6">
        Pre-built reports for common data analysis tasks. Select a date range
        and download as CSV.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <ReportCard key={report.title} report={report} companyFilter={companyFilter} />
        ))}
      </div>
    </div>
  );
}
