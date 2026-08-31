"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompany } from "@/lib/company-context";
import { generateCSV, downloadCSV } from "@/lib/export";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Landmark,
  Download,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  X,
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
}

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

/** Signed amount, red when negative, muted zero. */
function Amount({ value, bold }: { value: number; bold?: boolean }) {
  const v = Number(value) || 0;
  const cls =
    v < 0 ? "text-red-600" : v > 0 ? "text-gray-800" : "text-gray-400";
  return (
    <span className={`tabular-nums ${bold ? "font-semibold" : ""} ${cls}`}>
      {fmt(v)}
    </span>
  );
}

export function FinancialReportsClient() {
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { companyFilter } = useCompany();

  useEffect(() => {
    const supabase = createClient();
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
  }, [companyFilter, dateFrom, dateTo]);

  const periodActive = Boolean(dateFrom || dateTo);

  const rows = useMemo(() => {
    const tb = data?.trial_balance ?? [];
    return bucket === "All" ? tb : tb.filter((r) => r.bucket === bucket);
  }, [data, bucket]);

  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => ({
        debit: a.debit + (r.debit || 0),
        credit: a.credit + (r.credit || 0),
        balance: a.balance + (r.balance || 0),
      }),
      { debit: 0, credit: 0, balance: 0 }
    );
  }, [rows]);

  function exportTB() {
    const cols = ["code", "account", "type", "bucket", "debit", "credit", "balance"];
    const csv = generateCSV(
      rows.map((r) => ({
        code: r.code,
        account: r.name,
        type: r.account_type,
        bucket: r.bucket,
        debit: r.debit,
        credit: r.credit,
        balance: r.balance,
      })),
      cols
    );
    downloadCSV(csv, `trial_balance_${bucket.toLowerCase()}.csv`);
  }

  const s = data?.summary;
  const balanced = s ? Math.abs(s.bs_check) < 1 : false;
  const bsResult = s?.bs_result ?? s?.net ?? 0;
  const plCaption = periodActive
    ? `${dateFrom || "start"} → ${dateTo || "latest"}`
    : "all time";
  const bsCaption = `as of ${dateTo || "latest"}`;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Period controls — kept visible even while refetching */}
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
          P&amp;L &amp; Trial Balance cover the period; the Balance Sheet is a
          snapshot as of the &ldquo;to&rdquo; date. Amounts in QAR.
        </p>
      </div>

      {loading ? (
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          </div>
          <div className="mt-4 h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Could not load reports: {error}
        </div>
      ) : (
        <>
      {/* Summary: P&L + Balance Sheet */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Profit & Loss */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-[#1a1a2e]" />
            <h2 className="text-sm font-semibold text-[#1a1a2e]">
              Profit &amp; Loss
            </h2>
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
              {plCaption}
            </span>
          </div>
          <dl className="space-y-2.5">
            <Row
              icon={<TrendingUp className="h-3.5 w-3.5 text-green-500" />}
              label="Income (revenue)"
              value={s?.income ?? 0}
            />
            <Row
              icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
              label="Expenses"
              value={s?.expense ?? 0}
            />
            <div className="my-2 border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <dt className="text-sm font-semibold text-[#1a1a2e]">
                Net {s && s.net < 0 ? "Loss" : "Profit"}
              </dt>
              <dd
                className={`text-lg font-bold tabular-nums ${
                  s && s.net < 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {fmt(s?.net ?? 0)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Balance Sheet */}
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="h-4 w-4 text-[#1a1a2e]" />
            <h2 className="text-sm font-semibold text-[#1a1a2e]">
              Balance Sheet
            </h2>
            <span className="ml-auto text-[11px] text-gray-400 tabular-nums">
              {bsCaption}
            </span>
          </div>
          <dl className="space-y-2.5">
            <Row label="Assets" value={s?.assets ?? 0} />
            <Row label="Liabilities" value={s?.liabilities ?? 0} />
            <Row label="Equity" value={s?.equity ?? 0} />
            <Row label="Result (cumulative)" value={bsResult} />
            <div className="my-2 border-t border-gray-100" />
            <div className="flex items-center justify-between">
              <dt className="text-xs text-gray-500 flex items-center gap-1.5">
                {balanced ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                )}
                {balanced ? "Balances" : "Out of balance by"}
              </dt>
              <dd
                className={`text-xs tabular-nums ${
                  balanced ? "text-gray-400" : "text-amber-600 font-medium"
                }`}
              >
                {balanced ? "Assets = Liab + Equity + Result" : fmt(s?.bs_check ?? 0)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Trial Balance */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#1a1a2e] mr-2">
            Trial Balance
          </h2>
          <div className="flex flex-wrap gap-1.5">
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
          <button
            onClick={exportTB}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/60">
                <th className="text-left font-medium px-4 py-2.5">Code</th>
                <th className="text-left font-medium px-4 py-2.5">Account</th>
                <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">
                  Type
                </th>
                <th className="text-right font-medium px-4 py-2.5">Debit</th>
                <th className="text-right font-medium px-4 py-2.5">Credit</th>
                <th className="text-right font-medium px-4 py-2.5">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No accounts
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.code + r.account_type} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                      {r.code}
                    </td>
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
                    <td className="px-4 py-2.5 text-right">
                      <Amount value={r.debit} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Amount value={r.credit} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Amount value={r.balance} bold />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-100 bg-gray-50/60 font-semibold">
                  <td className="px-4 py-2.5 text-[#1a1a2e]" colSpan={3}>
                    Total ({rows.length} accounts)
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Amount value={totals.debit} bold />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Amount value={totals.credit} bold />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Amount value={totals.balance} bold />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-gray-500 flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-sm">
        <Amount value={value} />
      </dd>
    </div>
  );
}
