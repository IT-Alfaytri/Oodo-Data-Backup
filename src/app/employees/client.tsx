"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsBar } from "@/components/shared/stats-bar";
import { SearchToolbar } from "@/components/shared/search-toolbar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AnnotationPanel } from "@/components/shared/annotation-panel";
import { ExportDialog } from "@/components/shared/export-dialog";
import { RawDataViewer } from "@/components/shared/raw-data-viewer";
import { PAGE_SIZE } from "@/lib/constants";
import type { Employee } from "@/lib/types";
import { MessageSquare } from "lucide-react";

const COLUMNS: Column<Employee>[] = [
  { key: "name", label: "Name" },
  { key: "department_id", label: "Department" },
  { key: "job_title", label: "Job Title" },
  { key: "company_id", label: "Company" },
];

const EXPORT_COLUMNS = [
  "id",
  "name",
  "department_id",
  "job_title",
  "company_id",
];

export function EmployeesClient({ totalCount }: { totalCount: number }) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [page, setPage] = useState(1);
  const [filteredCount, setFilteredCount] = useState(totalCount);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [annotationTarget, setAnnotationTarget] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    let query = supabase
      .from("employees")
      .select("*", { count: "exact" })
      .order("name");

    if (search)
      query = query.or(
        `name.ilike.%${search}%,department_id.ilike.%${search}%,job_title.ilike.%${search}%`
      );

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setEmployees((data as Employee[]) ?? []);
    setFilteredCount(count ?? 0);
  }, [supabase, page, search]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCount / PAGE_SIZE);

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <StatsBar
          stats={[
            { label: "Total Employees", value: totalCount.toLocaleString() },
            { label: "Showing", value: filteredCount.toLocaleString() },
          ]}
        />
      </div>

      <SearchToolbar search={search} onSearch={setSearch}>
        <ExportDialog
          tableName="employees"
          dateColumn="id"
          columns={EXPORT_COLUMNS}
          fileName="employees"
        />
      </SearchToolbar>

      <div className="px-8 py-6">
        <DataTable
          columns={COLUMNS}
          data={employees}
          expandedId={expandedId}
          onRowClick={(id) => setExpandedId(expandedId === id ? null : id)}
          renderExpanded={(employee) => (
            <div className="p-5">
              <div className="flex gap-2">
                <button
                  onClick={() => setAnnotationTarget(employee.id)}
                  className="text-gray-400 hover:text-[#1a1a2e] p-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                {employee.raw_data && (
                  <RawDataViewer
                    data={employee.raw_data}
                    title={employee.name}
                  />
                )}
              </div>
            </div>
          )}
        />

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
        tableName="employees"
        recordId={annotationTarget ?? 0}
        isOpen={annotationTarget !== null}
        onClose={() => setAnnotationTarget(null)}
      />
    </>
  );
}
