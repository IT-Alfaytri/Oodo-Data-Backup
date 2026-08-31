"use client";

import { Fragment, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";

// ---- shared data shapes (from get_financial_reports / get_account_ledger) ----
export interface AccountLine {
  code: string;
  name: string | null;
  account_type: string;
  amount: number;
}
export interface EquityInfo {
  current_year: number;
  previous_years: number;
  retained: number;
}
export interface LedgerRow {
  move_name: string | null;
  date: string;
  communication: string | null;
  partner_id: string | null;
  debit: number;
  credit: number;
  running: number;
  id: number;
}
export interface LedgerData {
  code: string;
  count: number;
  total_debit: number;
  total_credit: number;
  limited: boolean;
  rows: LedgerRow[];
}

export type RowVariant =
  | "section"
  | "subheader"
  | "group"
  | "account"
  | "line"
  | "subtotal"
  | "total"
  | "grandtotal";

export interface StmtRow {
  key: string;
  variant: RowVariant;
  level: number;
  label: string;
  value: number | null;
  code?: string; // account rows → drillable
  groupId?: string; // group rows toggle; account rows carry their parent group
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmt(n: number | null): string {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const TYPE_LABEL: Record<string, string> = {
  income: "Operating Income",
  income_other: "Other Income",
  expense_direct_cost: "Cost of Goods Sold",
  expense: "Expenses",
  expense_depreciation: "Depreciation",
  asset_cash: "Bank and Cash Accounts",
  asset_receivable: "Receivables",
  asset_current: "Current Assets",
  asset_prepayments: "Prepayments",
  asset_fixed: "Fixed Assets",
  asset_non_current: "Non-current Assets",
  liability_payable: "Payables",
  liability_current: "Current Liabilities",
  liability_credit_card: "Credit Card",
  liability_non_current: "Non-current Liabilities",
};

function sumType(lines: AccountLine[], type: string): number {
  return round2(
    lines.filter((l) => l.account_type === type).reduce((a, l) => a + l.amount, 0)
  );
}

// Pushes a group row + its account rows; returns the group total (even if empty).
function pushGroup(
  rows: StmtRow[],
  lines: AccountLine[],
  type: string,
  level: number
): number {
  const accts = lines.filter((l) => l.account_type === type);
  const total = sumType(lines, type);
  if (accts.length === 0) return total;
  const gid = `g_${type}`;
  rows.push({
    key: gid,
    variant: "group",
    level,
    label: TYPE_LABEL[type] ?? type,
    value: total,
    groupId: gid,
  });
  accts
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach((a) =>
      rows.push({
        key: `a_${a.code}`,
        variant: "account",
        level: level + 1,
        label: `${a.code} ${a.name ?? ""}`.trim(),
        value: a.amount,
        code: a.code,
        groupId: gid,
      })
    );
  return total;
}

export function buildProfitAndLoss(pl: AccountLine[]): StmtRow[] {
  const rows: StmtRow[] = [];

  rows.push({ key: "s_income", variant: "section", level: 0, label: "Income", value: null });
  const op = pushGroup(rows, pl, "income", 1);
  rows.push({ key: "st_income", variant: "subtotal", level: 1, label: "Total Income", value: op });

  rows.push({ key: "s_cor", variant: "section", level: 0, label: "Cost of Revenue", value: null });
  const cogs = pushGroup(rows, pl, "expense_direct_cost", 1);
  rows.push({
    key: "st_cor",
    variant: "subtotal",
    level: 1,
    label: "Total Cost of Revenue",
    value: cogs,
  });

  rows.push({ key: "t_gross", variant: "total", level: 0, label: "Gross Profit", value: round2(op - cogs) });

  rows.push({ key: "s_other", variant: "section", level: 0, label: "Other Income", value: null });
  const oth = pushGroup(rows, pl, "income_other", 1);
  if (oth !== 0) {
    rows.push({ key: "st_other", variant: "subtotal", level: 1, label: "Total Other Income", value: oth });
  }

  rows.push({ key: "s_exp", variant: "section", level: 0, label: "Expenses", value: null });
  const exp = pushGroup(rows, pl, "expense", 1);
  const dep = pushGroup(rows, pl, "expense_depreciation", 1);
  rows.push({
    key: "st_exp",
    variant: "subtotal",
    level: 1,
    label: "Total Expenses",
    value: round2(exp + dep),
  });

  rows.push({
    key: "t_net",
    variant: "total",
    level: 0,
    label: "Net Profit",
    value: round2(op - cogs + oth - exp - dep),
  });
  return rows;
}

export function buildBalanceSheet(bs: AccountLine[], eq: EquityInfo): StmtRow[] {
  const rows: StmtRow[] = [];

  // ---- ASSETS ----
  rows.push({ key: "s_assets", variant: "section", level: 0, label: "Assets", value: null });
  rows.push({ key: "sh_ca", variant: "subheader", level: 1, label: "Current Assets", value: null });
  const cash = pushGroup(rows, bs, "asset_cash", 2);
  const recv = pushGroup(rows, bs, "asset_receivable", 2);
  const curr = pushGroup(rows, bs, "asset_current", 2);
  const prep = pushGroup(rows, bs, "asset_prepayments", 2);
  const totalCA = round2(cash + recv + curr + prep);
  rows.push({ key: "st_ca", variant: "subtotal", level: 1, label: "Total Current Assets", value: totalCA });
  rows.push({ key: "sh_fa", variant: "subheader", level: 1, label: "Plus Fixed Assets", value: null });
  const fixed = pushGroup(rows, bs, "asset_fixed", 2);
  rows.push({ key: "sh_nca", variant: "subheader", level: 1, label: "Plus Non-current Assets", value: null });
  const nonCA = pushGroup(rows, bs, "asset_non_current", 2);
  const totalAssets = round2(totalCA + fixed + nonCA);
  rows.push({ key: "t_assets", variant: "total", level: 0, label: "Total Assets", value: totalAssets });

  // ---- LIABILITIES ----
  rows.push({ key: "s_liab", variant: "section", level: 0, label: "Liabilities", value: null });
  rows.push({ key: "sh_cl", variant: "subheader", level: 1, label: "Current Liabilities", value: null });
  const pay = pushGroup(rows, bs, "liability_payable", 2);
  const curL = pushGroup(rows, bs, "liability_current", 2);
  const cc = pushGroup(rows, bs, "liability_credit_card", 2);
  const totalCL = round2(pay + curL + cc);
  rows.push({
    key: "st_cl",
    variant: "subtotal",
    level: 1,
    label: "Total Current Liabilities",
    value: totalCL,
  });
  rows.push({
    key: "sh_ncl",
    variant: "subheader",
    level: 1,
    label: "Plus Non-current Liabilities",
    value: null,
  });
  const nonL = pushGroup(rows, bs, "liability_non_current", 2);
  const totalLiab = round2(totalCL + nonL);
  rows.push({ key: "t_liab", variant: "total", level: 0, label: "Total Liabilities", value: totalLiab });

  // ---- EQUITY ----
  rows.push({ key: "s_eq", variant: "section", level: 0, label: "Equity", value: null });
  rows.push({
    key: "e_cye",
    variant: "line",
    level: 1,
    label: "Current Year Earnings",
    value: eq.current_year,
  });
  rows.push({
    key: "e_prev",
    variant: "line",
    level: 1,
    label: "Previous Years Unallocated Earnings",
    value: eq.previous_years,
  });
  if (round2(eq.retained) !== 0) {
    rows.push({ key: "e_ret", variant: "line", level: 1, label: "Retained Earnings", value: eq.retained });
  }
  const totalEquity = round2(eq.current_year + eq.previous_years + eq.retained);
  rows.push({ key: "t_eq", variant: "total", level: 0, label: "Total Equity", value: totalEquity });

  rows.push({
    key: "gt_le",
    variant: "grandtotal",
    level: 0,
    label: "Liabilities + Equity",
    value: round2(totalLiab + totalEquity),
  });
  return rows;
}

// ---- amount cell ----
function Value({ value, strong }: { value: number | null; strong?: boolean }) {
  if (value === null) return null;
  const neg = value < 0;
  return (
    <span
      className={`tabular-nums ${strong ? "font-semibold" : ""} ${
        neg ? "text-red-600" : "text-gray-800"
      }`}
    >
      {fmt(value)}
    </span>
  );
}

function LedgerBlock({ data, level }: { data: LedgerData | "loading"; level: number }) {
  const pad = 8 + (level + 1) * 18;
  if (data === "loading") {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-gray-400" style={{ paddingLeft: pad }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading entries…
      </div>
    );
  }
  if (data.rows.length === 0) {
    return (
      <div className="py-3 text-xs text-gray-400" style={{ paddingLeft: pad }}>
        No journal entries in this period.
      </div>
    );
  }
  return (
    <div className="my-1 rounded-lg border border-gray-100 bg-gray-50/50 overflow-hidden" style={{ marginLeft: pad }}>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-100/95 backdrop-blur">
            <tr className="text-[10px] uppercase tracking-wide text-gray-400">
              <th className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">Entry</th>
              <th className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">Date</th>
              <th className="px-2.5 py-1.5 text-left font-medium">Communication</th>
              <th className="px-2.5 py-1.5 text-left font-medium whitespace-nowrap">Partner</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Debit</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Credit</th>
              <th className="px-2.5 py-1.5 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/70">
                <td className="px-2.5 py-1 text-gray-600 whitespace-nowrap">{r.move_name ?? "—"}</td>
                <td className="px-2.5 py-1 text-gray-500 whitespace-nowrap">{r.date}</td>
                <td className="px-2.5 py-1 text-gray-500 max-w-xs truncate" title={r.communication ?? ""}>
                  {r.communication ?? "—"}
                </td>
                <td className="px-2.5 py-1 text-gray-500 whitespace-nowrap">{r.partner_id ?? "—"}</td>
                <td className="px-2.5 py-1 text-right tabular-nums text-gray-700">
                  {r.debit ? fmt(r.debit) : ""}
                </td>
                <td className="px-2.5 py-1 text-right tabular-nums text-gray-700">
                  {r.credit ? fmt(r.credit) : ""}
                </td>
                <td className="px-2.5 py-1 text-right tabular-nums font-medium text-gray-800">
                  {fmt(r.running)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-gray-100 text-[10px] text-gray-500">
        <span>
          {data.count.toLocaleString()} entr{data.count === 1 ? "y" : "ies"}
          {data.limited && ` · showing first ${data.rows.length.toLocaleString()}`}
        </span>
        <span className="tabular-nums">
          Dr {fmt(data.total_debit)} · Cr {fmt(data.total_credit)}
        </span>
      </div>
    </div>
  );
}

export function Statement({
  rows,
  fetchLedger,
}: {
  rows: StmtRow[];
  fetchLedger: (code: string) => Promise<LedgerData>;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [openAccts, setOpenAccts] = useState<Set<string>>(new Set());
  const [ledger, setLedger] = useState<Record<string, LedgerData | "loading">>({});

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleAcct(code: string) {
    let willOpen = false;
    setOpenAccts((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else {
        next.add(code);
        willOpen = true;
      }
      return next;
    });
    if (willOpen && !ledger[code]) {
      setLedger((l) => ({ ...l, [code]: "loading" }));
      try {
        const d = await fetchLedger(code);
        setLedger((l) => ({ ...l, [code]: d }));
      } catch {
        setLedger((l) => ({
          ...l,
          [code]: { code, count: 0, total_debit: 0, total_credit: 0, limited: false, rows: [] },
        }));
      }
    }
  }

  return (
    <div className="text-sm">
      {rows.map((r) => {
        // Account rows only render when their parent group is open.
        if (r.variant === "account" && r.groupId && !openGroups.has(r.groupId)) return null;

        const pad = 8 + r.level * 18;
        const isGroup = r.variant === "group";
        const isAccount = r.variant === "account";
        const clickable = isGroup || isAccount;
        const open = isGroup
          ? openGroups.has(r.groupId!)
          : isAccount
          ? openAccts.has(r.code!)
          : false;

        const base = "flex items-center justify-between gap-3 px-2";
        const byVariant: Record<RowVariant, string> = {
          section: "mt-3 py-2 border-b border-gray-200 font-semibold text-[#1a1a2e] uppercase tracking-wide text-xs",
          subheader: "py-1.5 text-gray-500",
          group: "py-1.5 text-gray-700 hover:bg-gray-50 rounded",
          account: "py-1 text-gray-600 hover:bg-gray-50 rounded",
          line: "py-1.5 text-gray-600",
          subtotal: "py-1.5 border-t border-gray-200 font-semibold text-[#1a1a2e]",
          total: "py-2 mt-0.5 border-t-2 border-gray-300 font-bold text-[#1a1a2e]",
          grandtotal: "py-2 mt-1 border-t-4 border-double border-gray-400 font-bold text-[#1a1a2e]",
        };

        return (
          <Fragment key={r.key}>
            <div
              className={`${base} ${byVariant[r.variant]} ${clickable ? "cursor-pointer" : ""}`}
              style={{ paddingLeft: pad }}
              onClick={
                clickable
                  ? () => (isGroup ? toggleGroup(r.groupId!) : toggleAcct(r.code!))
                  : undefined
              }
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isGroup) toggleGroup(r.groupId!);
                        else toggleAcct(r.code!);
                      }
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-1 min-w-0">
                {clickable ? (
                  <ChevronRight
                    className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${
                      open ? "rotate-90" : ""
                    }`}
                  />
                ) : (
                  <span className="w-3.5 flex-shrink-0" />
                )}
                <span className="truncate">{r.label}</span>
              </span>
              <Value value={r.value} strong={r.variant === "total" || r.variant === "grandtotal"} />
            </div>
            {isAccount && open && (
              <LedgerBlock data={ledger[r.code!] ?? "loading"} level={r.level} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
