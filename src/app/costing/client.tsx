"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsBar } from "@/components/shared/stats-bar";
import { SearchToolbar } from "@/components/shared/search-toolbar";
import { AccordionCard } from "@/components/shared/accordion-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { RawDataViewer } from "@/components/shared/raw-data-viewer";
import { formatAmount, PAGE_SIZE } from "@/lib/constants";
import type { LandedCost, LandedCostLine } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Done", value: "done" },
  { label: "Draft", value: "draft" },
  { label: "Cancelled", value: "cancel" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "date",
  "state",
  "amount_total",
  "vendor_bill_id",
  "account_journal_id",
];

export function CostingClient({
  totalCount,
  totalAmount,
}: {
  totalCount: number;
  totalAmount: number;
}) {
  const supabase = createClient();
  const [costs, setCosts] = useState<LandedCost[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, LandedCostLine[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchCosts = useCallback(async () => {
    let query = supabase
      .from("landed_costs")
      .select("*", { count: "exact" })
      .order("date", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,vendor_bill_id.ilike.%${search}%`
      );
    }
    if (statusFilter) {
      query = query.eq("state", statusFilter);
    }

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setCosts((data as LandedCost[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function loadLines(costId: number) {
    if (lines[costId]) return;
    const { data } = await supabase
      .from("landed_cost_lines")
      .select("*")
      .eq("cost_id", costId)
      .order("id");
    if (data)
      setLines((prev) => ({
        ...prev,
        [costId]: data as LandedCostLine[],
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
            { label: "Total Records", value: totalCount.toLocaleString() },
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
          tableName="landed_costs"
          dateColumn="date"
          columns={EXPORT_COLUMNS}
          fileName="landed_costs"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        {costs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-base">
            No records found
          </div>
        ) : (
          costs.map((cost) => (
            <AccordionCard
              key={cost.id}
              id={cost.id}
              name={cost.name}
              partner={cost.vendor_bill_id}
              date={cost.date}
              amount={cost.amount_total}
              status={cost.state}
              isOpen={expandedId === cost.id}
              onToggle={() => handleToggle(cost.id)}
            >
              <div className="px-5 py-3 bg-gray-50 flex gap-6 flex-wrap border-b border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Account Journal
                  </div>
                  <div className="text-sm text-gray-700">
                    {cost.account_journal_id ?? "—"}
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotationTarget(cost.id);
                    }}
                    className="text-gray-400 hover:text-[#1a1a2e] p-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  {cost.raw_data && (
                    <RawDataViewer data={cost.raw_data} title={cost.name} />
                  )}
                </div>
              </div>

              {lines[cost.id] ? (
                <>
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Description
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Product
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Cost
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Split Method
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Account
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines[cost.id].map((line) => (
                        <tr key={line.id} className="hover:bg-[#1a1a2e08]">
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.name ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.product_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right font-semibold">
                            {formatAmount(line.price_unit)}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.split_method ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {line.account_id ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                    {lines[cost.id].length} line(s)
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
        tableName="landed_costs"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
