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
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, PAGE_SIZE } from "@/lib/constants";
import type { StockPicking, StockMove } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const FILTERS = [
  { label: "Done", value: "done" },
  { label: "Draft", value: "draft" },
  { label: "Ready", value: "assigned" },
  { label: "Cancelled", value: "cancel" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "origin",
  "partner_id",
  "picking_type_id",
  "location_id",
  "location_dest_id",
  "date",
  "date_done",
  "state",
];

export function StockMovementsClient({
  totalCount,
}: {
  totalCount: number;
}) {
  const supabase = createClient();
  const [pickings, setPickings] = useState<StockPicking[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<number, StockMove[]>>({});
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchPickings = useCallback(async () => {
    let query = supabase
      .from("stock_pickings")
      .select("*", { count: "exact" })
      .order("date", { ascending: false });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,origin.ilike.%${search}%,partner_id.ilike.%${search}%`
      );
    }
    if (statusFilter) {
      query = query.eq("state", statusFilter);
    }

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setPickings((data as StockPicking[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search, statusFilter]);

  useEffect(() => {
    fetchPickings();
  }, [fetchPickings]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function loadLines(pickingId: number) {
    if (lines[pickingId]) return;
    const { data } = await supabase
      .from("stock_moves")
      .select("*")
      .eq("picking_id", pickingId)
      .order("id");
    if (data)
      setLines((prev) => ({
        ...prev,
        [pickingId]: data as StockMove[],
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
            { label: "Total Pickings", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
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
          tableName="stock_pickings"
          dateColumn="date"
          columns={EXPORT_COLUMNS}
          fileName="stock_movements"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        {pickings.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-base">
            No records found
          </div>
        ) : (
          pickings.map((picking) => (
            <AccordionCard
              key={picking.id}
              id={picking.id}
              name={picking.name}
              partner={picking.partner_id}
              date={picking.date}
              amount={0}
              status={picking.state}
              isOpen={expandedId === picking.id}
              onToggle={() => handleToggle(picking.id)}
              extraMeta={[
                { label: "Origin", value: picking.origin ?? "" },
              ]}
            >
              <div className="px-5 py-3 bg-gray-50 flex gap-6 flex-wrap border-b border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Operation Type
                  </div>
                  <div className="text-sm text-gray-700">
                    {picking.picking_type_id ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Source Location
                  </div>
                  <div className="text-sm text-gray-700">
                    {picking.location_id ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Destination
                  </div>
                  <div className="text-sm text-gray-700">
                    {picking.location_dest_id ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Date Done
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatDate(picking.date_done)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">
                    Scheduled Date
                  </div>
                  <div className="text-sm text-gray-700">
                    {formatDate(picking.scheduled_date)}
                  </div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnnotationTarget(picking.id);
                    }}
                    className="text-gray-400 hover:text-[#1a1a2e] p-1"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  {picking.raw_data && (
                    <RawDataViewer
                      data={picking.raw_data}
                      title={picking.name}
                    />
                  )}
                </div>
              </div>

              {lines[picking.id] ? (
                <>
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Product
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Demand
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-right text-[11px] text-gray-500 uppercase font-semibold">
                          Done
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          UoM
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          From
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          To
                        </th>
                        <th className="bg-gray-100 px-3 py-2 text-left text-[11px] text-gray-500 uppercase font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines[picking.id].map((move) => (
                        <tr key={move.id} className="hover:bg-[#1a1a2e08]">
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {move.product_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {move.product_uom_qty}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-right text-gray-700">
                            {move.quantity_done}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {move.product_uom ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {move.location_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                            {move.location_dest_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 border-t border-gray-100">
                            <StatusBadge status={move.state} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                    {lines[picking.id].length} line(s)
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
        tableName="stock_pickings"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
