"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { downloadCSV } from "@/lib/export";
import { downloadXlsx } from "@/lib/xlsx";
import { printHtml, buildReportHtml, type PrintTable } from "@/lib/print";
import {
  Statement,
  buildProfitAndLoss,
  buildBalanceSheet,
  type AccountLine,
  type EquityInfo,
  type LedgerData,
  type StmtRow,
} from "./statement";
import {
  CalendarRange,
  X,
  Printer,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Summary {
  income: number;
  expense: number;
  net: number;
  assets: number;
  liabilities: number;
  equity: number;
  bs_result?: number;
  bs_check: number;
}
interface TBRow {
  code: string;
  name: string;
  account_type: string;
  bucket: string;
  debit: number;
  credit: number;
  balance: number;
}
interface Reports {
  summary: Summary;
  trial_balance: TBRow[];
  pl_accounts: AccountLine[];
  bs_accounts: AccountLine[];
  equity: EquityInfo;
  ref_date: string | null;
}

type Tab = "pl" | "bs" | "tb";
const TABS: { key: Tab; label: string }[] = [
  { key: "pl", label: "Profit & Loss" },
  { key: "bs", label: "Balance Sheet" },
  { key: "tb", label: "Trial Balance" },
];

const BUCKETS = ["All", "Asset", "Liability", "Equity", "Income", "Expense"] as const;
const BUCKET_COLOR: Record<string, string> = {
  Asset: "text-blue-600 bg-blue-50",
  Liability: "text-amber-600 bg-amber-50",
  Equity: "text-purple-600 bg-purple-50",
  Income: "text-green-600 bg-green-50",
  Expense: "text-red-600 bg-red-50",
  Other: "text-gray-500 bg-gray-50",
};

function fmt(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function matrixCsv(columns: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// ---- statement (P&L / BS) → export shapes ----
function statementMatrix(rows: StmtRow[]): { columns: string[]; rows: (string | number | null)[][] } {
  return {
    columns: ["Account", "Amount"],
    rows: rows.map((r) => ["  ".repeat(r.level) + r.label, r.value]),
  };
}
function statementPrint(rows: StmtRow[]): PrintTable {
  return {
    columns: [
      { label: "Account", align: "left" },
      { label: "Amount", align: "right" },
    ],
    rows: rows.map((r) => ({
      cells: [r.label, r.value],
      indent: r.level,
      bold:
        r.variant === "section" ||
        r.variant === "subtotal" ||
        r.variant === "total" ||
        r.variant === "grandtotal",
      topBorder: r.variant === "subtotal" || r.variant === "total" || r.variant === "grandtotal",
      muted: r.variant === "subheader",
    })),
  };
}

export function FinancialReportsClient() {
  const supabase = createClient();
  const { companyFilter } = useCompany();
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pl");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>("All");

  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_financial_reports", {
          p_company: companyFilter,
          p_date_from: dateFrom || null,
          p_date_to: dateTo || null,
        });
        if (error) setError(error.message);
        else setData(data as Reports);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, companyFilter, dateFrom, dateTo]);

  const periodActive = Boolean(dateFrom || dateTo);
  const asOf = dateTo || data?.ref_date || "latest";
  const companyLabel = companyFilter ?? "All Companies";

  const plRows = useMemo(
    () => (data ? buildProfitAndLoss(data.pl_accounts) : []),
    [data]
  );
  const bsRows = useMemo(
    () => (data ? buildBalanceSheet(data.bs_accounts, data.equity) : []),
    [data]
  );

  const tbRows = useMemo(() => {
    const tb = data?.trial_balance ?? [];
    return bucket === "All" ? tb : tb.filter((r) => r.bucket === bucket);
  }, [data, bucket]);
  const tbTotals = useMemo(
    () =>
      tbRows.reduce(
        (a, r) => ({
          debit: a.debit + (r.debit || 0),
          credit: a.credit + (r.credit || 0),
          balance: a.balance + (r.balance || 0),
        }),
        { debit: 0, credit: 0, balance: 0 }
      ),
    [tbRows]
  );

  // Drill-down: P&L uses the period; Balance Sheet is cumulative as-of `to`.
  function makeLedgerFetcher(kind: "pl" | "bs") {
    return async (code: string): Promise<LedgerData> => {
      const from = kind === "pl" ? dateFrom || null : null;
      const { data, error } = await supabase.rpc("get_account_ledger", {
        p_code: code,
        p_company: companyFilter,
        p_date_from: from,
        p_date_to: dateTo || null,
      });
      if (error) throw new Error(error.message);
      return data as LedgerData;
    };
  }

  const periodLabel =
    tab === "bs"
      ? `As of ${asOf}`
      : periodActive
      ? `${dateFrom || "start"} → ${dateTo || "latest"}`
      : "All time";
  const suffix = periodActive ? `_${dateFrom || "start"}_${dateTo || "end"}` : "";

  function activeExport(): {
    title: string;
    file: string;
    matrix: { columns: string[]; rows: (string | number | null)[][] };
    print: PrintTable;
  } {
    if (tab === "pl") {
      return {
        title: "Profit and Loss",
        file: `profit_and_loss${suffix}`,
        matrix: statementMatrix(plRows),
        print: statementPrint(plRows),
      };
    }
    if (tab === "bs") {
      return {
        title: "Balance Sheet",
        file: `balance_sheet${suffix}`,
        matrix: statementMatrix(bsRows),
        print: statementPrint(bsRows),
      };
    }
    const cols = ["Code", "Account", "Type", "Debit", "Credit", "Balance"];
    return {
      title: "Trial Balance",
      file: `trial_balance_${bucket.toLowerCase()}${suffix}`,
      matrix: {
        columns: cols,
        rows: tbRows.map((r) => [r.code, r.name, r.account_type, r.debit, r.credit, r.balance]),
      },
      print: {
        columns: [
          { label: "Code", align: "left" },
          { label: "Account", align: "left" },
          { label: "Debit", align: "right" },
          { label: "Credit", align: "right" },
          { label: "Balance", align: "right" },
        ],
        rows: tbRows.map((r) => ({ cells: [r.code, r.name, r.debit, r.credit, r.balance] })),
      },
    };
  }

  function doExport(kind: "pdf" | "xlsx" | "csv") {
    const exp = activeExport();
    if (kind === "csv") {
      downloadCSV(matrixCsv(exp.matrix.columns, exp.matrix.rows), `${exp.file}.csv`);
    } else if (kind === "xlsx") {
      downloadXlsx([{ name: exp.title, columns: exp.matrix.columns, rows: exp.matrix.rows }], exp.file);
    } else {
      printHtml(
        buildReportHtml({
          title: exp.title,
          company: companyLabel,
          period: periodLabel,
          table: exp.print,
        })
      );
    }
  }

  const balanced = data ? Math.abs(data.summary.bs_check) < 1 : false;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Period controls — always visible, even while refetching */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-gray-500">
          <CalendarRange className="h-4 w-4" />
          <span className="text-xs font-medium">Period</span>
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-200 rounded-md text-gray-600 focus:border-[#1a1a2e] focus:outline-none"
          title="From date — applies to Profit & Loss and Trial Balance"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-200 rounded-md text-gray-600 focus:border-[#1a1a2e] focus:outline-none"
          title="To / as-of date — the Balance Sheet is a snapshot as of this date"
        />
        {periodActive && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1"
            title="Clear period"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
        <p className="text-[11px] text-gray-400 sm:ml-auto">
          {companyLabel} &middot; Amounts in QAR
        </p>
      </div>

      {/* Tabs + export toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                tab === t.key
                  ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <ExportBtn icon={<Printer className="h-4 w-4" />} label="PDF" onClick={() => doExport("pdf")} disabled={loading} />
          <ExportBtn icon={<FileSpreadsheet className="h-4 w-4" />} label="XLSX" onClick={() => doExport("xlsx")} disabled={loading} />
          <ExportBtn icon={<Download className="h-4 w-4" />} label="CSV" onClick={() => doExport("csv")} disabled={loading} />
        </div>
      </div>

      {loading ? (
        <div className="h-96 rounded-xl bg-gray-100 animate-pulse" />
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Could not load reports: {error}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6">
          {/* Report header */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-[#1a1a2e]">
                {tab === "pl" ? "Profit & Loss" : tab === "bs" ? "Balance Sheet" : "Trial Balance"}
              </h2>
              <p className="text-xs text-gray-400 tabular-nums">{periodLabel}</p>
            </div>
            {tab === "bs" && (
              <span
                className={`flex items-center gap-1.5 text-xs ${
                  balanced ? "text-green-600" : "text-amber-600 font-medium"
                }`}
              >
                {balanced ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {balanced ? "Balanced" : `Out by ${fmt(data?.summary.bs_check)}`}
              </span>
            )}
          </div>

          {tab === "pl" && (
            <Statement
              key={`pl-${companyFilter}-${dateFrom}-${dateTo}`}
              rows={plRows}
              fetchLedger={makeLedgerFetcher("pl")}
            />
          )}
          {tab === "bs" && (
            <Statement
              key={`bs-${companyFilter}-${dateFrom}-${dateTo}`}
              rows={bsRows}
              fetchLedger={makeLedgerFetcher("bs")}
            />
          )}
          {tab === "tb" && (
            <div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {BUCKETS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBucket(b)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                      bucket === b
                        ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/60">
                      <th className="text-left font-medium px-4 py-2.5">Code</th>
                      <th className="text-left font-medium px-4 py-2.5">Account</th>
                      <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Type</th>
                      <th className="text-right font-medium px-4 py-2.5">Debit</th>
                      <th className="text-right font-medium px-4 py-2.5">Credit</th>
                      <th className="text-right font-medium px-4 py-2.5">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tbRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                          No accounts
                        </td>
                      </tr>
                    ) : (
                      tbRows.map((r) => (
                        <tr key={r.code + r.account_type} className="hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.code}</td>
                          <td className="px-4 py-2.5 text-gray-700">{r.name}</td>
                          <td className="px-4 py-2.5 hidden sm:table-cell">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${
                                BUCKET_COLOR[r.bucket] ?? BUCKET_COLOR.Other
                              }`}
                            >
                              {r.bucket}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                            {r.debit ? fmt(r.debit) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                            {r.credit ? fmt(r.credit) : "—"}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                              r.balance < 0 ? "text-red-600" : "text-gray-800"
                            }`}
                          >
                            {fmt(r.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {tbRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-100 bg-gray-50/60 font-semibold">
                        <td className="px-4 py-2.5 text-[#1a1a2e]" colSpan={3}>
                          Total ({tbRows.length} accounts)
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmt(tbTotals.debit)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmt(tbTotals.credit)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{fmt(tbTotals.balance)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExportBtn({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
