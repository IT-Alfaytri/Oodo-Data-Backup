"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { Header } from "@/components/layout/header";
import { formatAmount } from "@/lib/constants";
import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  Package,
  Users,
  Factory,
  Calculator,
  FileText,
  Receipt,
  FileX,
  Warehouse,
  ArrowLeftRight,
  DollarSign,
  Briefcase,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Landmark,
} from "lucide-react";

const TODAY = new Date().toISOString().slice(0, 10);

const SECTIONS = [
  {
    label: "Sales Orders",
    href: "/sales",
    icon: ShoppingCart,
    table: "sale_orders",
    color: "#e74c3c",
  },
  {
    label: "Purchase Orders",
    href: "/purchases",
    icon: Truck,
    table: "purchase_orders",
    color: "#8e44ad",
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    table: "product_templates",
    color: "#2ecc71",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    table: "contacts",
    color: "#3498db",
    filter: { column: "customer_rank", op: "gt" as const, value: 0 },
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Factory,
    table: "contacts",
    color: "#8e44ad",
    filter: { column: "supplier_rank", op: "gt" as const, value: 0 },
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    table: "payments",
    color: "#f39c12",
  },
  {
    label: "Customer Invoices",
    href: "/invoices/customer",
    icon: FileText,
    table: "invoices",
    color: "#1abc9c",
    filter: { column: "move_type", op: "eq" as const, value: "out_invoice" },
  },
  {
    label: "Vendor Bills",
    href: "/invoices/vendor",
    icon: Receipt,
    table: "invoices",
    color: "#e74c3c",
    filter: { column: "move_type", op: "eq" as const, value: "in_invoice" },
  },
  {
    label: "Credit Notes",
    href: "/invoices/credit-notes",
    icon: FileX,
    table: "invoices",
    color: "#9b59b6",
    filter: {
      column: "move_type",
      op: "in" as const,
      value: "(out_refund,in_refund)",
    },
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Warehouse,
    table: "stock_quants",
    color: "#27ae60",
  },
  {
    label: "Stock Movements",
    href: "/stock-movements",
    icon: ArrowLeftRight,
    table: "stock_pickings",
    color: "#2980b9",
  },
  {
    label: "Costing",
    href: "/costing",
    icon: DollarSign,
    table: "landed_costs",
    color: "#d35400",
    noCompany: true,
  },
  {
    label: "Employees",
    href: "/employees",
    icon: Briefcase,
    table: "employees",
    color: "#7f8c8d",
  },
];

export default function DashboardPage() {
  const supabase = createClient();
  const { companyFilter } = useCompany();

  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalSales, setTotalSales] = useState(0);
  const [kpis, setKpis] = useState({ ar: 0, ap: 0, overdue: 0, net: 0 });
  const [userEmail, setUserEmail] = useState<string | undefined>();

  // Fetch user email on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email);
    });
  }, [supabase]);

  // Fetch all dashboard data in parallel when companyFilter changes
  const fetchData = useCallback(async () => {
    setLoading(true);

    // Build all count queries
    const countPromises = SECTIONS.map((section) => {
      let query = supabase
        .from(section.table)
        .select("*", { count: "exact", head: true });

      if (section.filter) {
        if (section.filter.op === "gt")
          query = query.gt(section.filter.column, section.filter.value);
        else if (section.filter.op === "eq")
          query = query.eq(section.filter.column, section.filter.value);
        else if (section.filter.op === "in") {
          const vals = String(section.filter.value)
            .replace(/[()]/g, "")
            .split(",");
          query = query.in(section.filter.column, vals);
        }
      }

      if (companyFilter !== null && !section.noCompany) {
        query = query.eq("company_id", companyFilter);
      }

      return query;
    });

    // Build sales total query
    let salesQuery = supabase
      .from("sale_orders")
      .select("amount_total")
      .not("amount_total", "is", null);

    if (companyFilter !== null) {
      salesQuery = salesQuery.eq("company_id", companyFilter);
    }

    // Run everything in parallel
    const [salesResult, ...countResults] = await Promise.all([
      salesQuery,
      ...countPromises,
    ]);

    // Process counts
    const newCounts: Record<string, number> = {};
    SECTIONS.forEach((section, i) => {
      newCounts[section.label] = countResults[i].count ?? 0;
    });
    setCounts(newCounts);

    // Process sales total (sum client-side)
    const salesData = salesResult.data;
    const total =
      salesData?.reduce(
        (sum: number, row: { amount_total: number | null }) =>
          sum + (row.amount_total ?? 0),
        0
      ) ?? 0;
    setTotalSales(total);

    // Financial KPIs (company-aware). Aggregates are enabled on this project.
    const arApBase = (mt: string) => {
      let q = supabase
        .from("invoices")
        .select("amount_residual.sum()")
        .eq("move_type", mt)
        .eq("state", "posted");
      if (companyFilter !== null) q = q.eq("company_id", companyFilter);
      return q;
    };
    let overdueQ = supabase
      .from("invoices")
      .select("amount_residual.sum()")
      .eq("move_type", "out_invoice")
      .eq("state", "posted")
      .neq("payment_state", "paid")
      .not("invoice_date_due", "is", null)
      .lt("invoice_date_due", TODAY);
    if (companyFilter !== null) overdueQ = overdueQ.eq("company_id", companyFilter);

    const [arRes, apRes, ovRes, finRes] = await Promise.all([
      arApBase("out_invoice").single(),
      arApBase("in_invoice").single(),
      overdueQ.single(),
      supabase.rpc("get_financial_reports", { p_company: companyFilter }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sum = (r: any) => (r?.data?.sum ?? 0) as number;
    setKpis({
      ar: sum(arRes),
      ap: sum(apRes),
      overdue: sum(ovRes),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      net: (finRes.data as any)?.summary?.net ?? 0,
    });

    setLoading(false);
  }, [supabase, companyFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <Header title="Al-Faytri - Data Viewer" userEmail={userEmail} />
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="flex gap-8 mb-8 flex-wrap">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1a1a2e]">
                  {Object.values(counts)
                    .reduce((a, b) => a + b, 0)
                    .toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Records
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1a1a2e]">
                  {formatAmount(totalSales)}
                </div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Sales
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <KpiCard tone="emerald" icon={<TrendingUp className="h-5 w-5" />} label="Receivable (unpaid)" value={formatAmount(kpis.ar)} />
              <KpiCard tone="orange" icon={<TrendingDown className="h-5 w-5" />} label="Payable (unpaid)" value={formatAmount(kpis.ap)} />
              <KpiCard tone="red" icon={<AlertTriangle className="h-5 w-5" />} label="Overdue Receivable" value={formatAmount(kpis.overdue)} />
              <KpiCard tone="indigo" icon={<Landmark className="h-5 w-5" />} label="Net Profit (posted)" value={formatAmount(kpis.net)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className="flex items-center gap-4 px-6 py-5 bg-white rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: section.color }}
                  >
                    <Icon
                      className="h-7 w-7 flex-shrink-0"
                      style={{ color: section.color }}
                    />
                    <div>
                      <div className="text-base font-semibold text-gray-800">
                        {section.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {counts[section.label]?.toLocaleString() ?? 0} records
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

const TONES: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  indigo: "bg-indigo-50 text-indigo-600",
};

function KpiCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
      <div
        className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          TONES[tone] ?? TONES.indigo
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-[#1a1a2e] tabular-nums truncate">
          {value}
        </div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}
