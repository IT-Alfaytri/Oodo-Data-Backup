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
import { Search, ChevronRight, MessageSquare } from "lucide-react";

export interface LineCol {
  key: string;
  label: string;
  money?: boolean; // format as amount, right-aligned
  num?: boolean; // plain number, right-aligned
}
interface StatusCol {
  key: string;
  label: string;
}
interface MetaField {
  key: string;
  label: string;
  money?: boolean;
  percent?: boolean;
}

interface Props {
  table: string;
  linesTable: string;
  linesFk: string;
  model: string; // Odoo model for chatter, e.g. "sale.order"
  partnerLabel: string;
  totalLabel: string;
  exportFileName: string;
  dateColumn: string; // "date_order"
  stateFilters: { label: string; value: string }[];
  statusColumns: StatusCol[];
  lineColumns: LineCol[];
  metaFields: MetaField[];
  exportColumns: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any> & { id: number };

export function OrderListView(props: Props) {
  const {
    table, linesTable, linesFk, model, partnerLabel, totalLabel,
    exportFileName, dateColumn, stateFilters, statusColumns, lineColumns,
    metaFields, exportColumns,
  } = props;

  const supabase = createClient();
  const { companyFilter } = useCompany();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, Row[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    let q = supabase.from(table).select("amount_total.sum(), id.count()");
    if (companyFilter) q = q.eq("company_id", companyFilter);
    const { data } = await q.single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTotalCount((data as any).count ?? 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTotalAmount((data as any).sum ?? 0);
    }
  }, [supabase, table, companyFilter]);

  const fetchRows = useCallback(async () => {
    let q = supabase
      .from(table)
      .select("*", { count: "exact" })
      .order(dateColumn, { ascending: false });
    if (companyFilter) q = q.eq("company_id", companyFilter);
    if (search) q = q.or(`name.ilike.%${search}%,partner_id.ilike.%${search}%`);
    if (stateFilter) q = q.eq("state", stateFilter);
    const from = (page - 1) * PAGE_SIZE;
    q = q.range(from, from + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRows((data as Row[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, table, dateColumn, page, search, stateFilter, companyFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchRows();
  }, [fetchRows]);
  useEffect(() => {
    setPage(1);
  }, [search, stateFilter, companyFilter]);

  async function loadLines(id: number) {
    if (lines[id]) return;
    const { data } = await supabase.from(linesTable).select("*").eq(linesFk, id).order("id");
    if (data) setLines((prev) => ({ ...prev, [id]: data as Row[] }));
  }
  function toggle(id: number) {
    if (expandedId === id) setExpandedId(null);
    else {
      setExpandedId(id);
      loadLines(id);
    }
  }

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);
  const th = "px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 whitespace-nowrap";

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

      <div className="bg-white px-8 py-3 border-b border-gray-200 sticky top-0 z-30 flex gap-2.5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${partnerLabel.toLowerCase()} / number…`}
            className="pl-9"
          />
        </div>
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
        {stateFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStateFilter(stateFilter === f.value ? "" : f.value)}
            className={`px-3 py-1 border rounded-full text-xs font-semibold transition-colors ${
              stateFilter === f.value
                ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
                : "bg-white text-gray-600 border-gray-300 hover:border-[#1a1a2e]"
            }`}
          >
            {f.label}
          </button>
        ))}
        <ExportDialog
          tableName={table}
          dateColumn={dateColumn}
          columns={exportColumns}
          fileName={exportFileName}
        />
      </div>

      <div className="px-8 py-4">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th + " w-8"}></th>
                  <th className={th}>Number</th>
                  <th className={th}>{partnerLabel}</th>
                  <th className={th}>Date</th>
                  <th className={th + " text-right"}>Total</th>
                  {statusColumns.map((s) => (
                    <th key={s.key} className={th + " text-center hidden md:table-cell"}>
                      {s.label}
                    </th>
                  ))}
                  <th className={th + " text-center"}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5 + statusColumns.length + 1} className="text-center py-16 text-gray-400">
                      No records found
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const open = expandedId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr
                          onClick={() => toggle(r.id)}
                          className={`cursor-pointer border-t border-gray-100 hover:bg-[#1a1a2e08] ${open ? "bg-[#1a1a2e0a]" : ""}`}
                        >
                          <td className="px-3 py-2.5 text-gray-400">
                            <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-[#1a1a2e] whitespace-nowrap">{r.name}</td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[240px] truncate">{r.partner_id ?? "—"}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(r[dateColumn])}</td>
                          <td className="px-3 py-2.5 text-right text-gray-800 tabular-nums whitespace-nowrap">
                            {formatAmount(r.amount_total)}
                          </td>
                          {statusColumns.map((s) => (
                            <td key={s.key} className="px-3 py-2.5 text-center hidden md:table-cell">
                              <StatusBadge status={r[s.key]} />
                            </td>
                          ))}
                          <td className="px-3 py-2.5 text-center">
                            <StatusBadge status={r.state} />
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={5 + statusColumns.length + 1} className="p-0 border-t border-gray-100">
                              <OrderDetail
                                row={r}
                                lines={lines[r.id]}
                                model={model}
                                metaFields={metaFields}
                                lineColumns={lineColumns}
                                onAnnotate={() => setAnnotationTarget(r.id)}
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
        tableName={table}
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}

function OrderDetail({
  row,
  lines,
  model,
  metaFields,
  lineColumns,
  onAnnotate,
}: {
  row: Row;
  lines: Row[] | undefined;
  model: string;
  metaFields: MetaField[];
  lineColumns: LineCol[];
  onAnnotate: () => void;
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {metaFields.length > 0 && (
        <div className="px-5 py-3 flex gap-6 flex-wrap border-b border-gray-100">
          {metaFields.map((m) => {
            const v = row[m.key];
            const text =
              v == null || v === ""
                ? "—"
                : m.money
                ? formatAmount(v)
                : m.percent
                ? `${Number(v).toFixed(1)}%`
                : String(v);
            return (
              <div key={m.key}>
                <div className="text-[10px] text-gray-400 uppercase">{m.label}</div>
                <div className="text-sm text-gray-700">{text}</div>
              </div>
            );
          })}
          <button
            onClick={onAnnotate}
            className="ml-auto text-gray-400 hover:text-[#1a1a2e] p-1 self-start"
            title="Notes"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      )}

      {lines ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {lineColumns.map((c) => (
                    <th
                      key={c.key}
                      className={`bg-gray-100 px-3 py-2 text-[11px] text-gray-500 uppercase font-semibold ${
                        c.money || c.num ? "text-right" : "text-left"
                      }`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-[#1a1a2e08]">
                    {lineColumns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2 border-t border-gray-100 text-gray-700 ${
                          c.money || c.num ? "text-right" : ""
                        }`}
                      >
                        {c.money ? formatAmount(line[c.key]) : String(line[c.key] ?? "—")}
                      </td>
                    ))}
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
      <ChatterPanel model={model} resId={row.id} />
    </div>
  );
}
