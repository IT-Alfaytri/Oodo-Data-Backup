"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface SearchToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilter?: (value: string) => void;
  onExport?: () => void;
  children?: React.ReactNode;
}

export function SearchToolbar({
  search,
  onSearch,
  filters,
  activeFilter,
  onFilter,
  onExport,
  children,
}: SearchToolbarProps) {
  return (
    <div className="bg-white px-8 py-3 border-b border-gray-200 flex gap-2.5 flex-wrap items-center sticky top-0 z-30">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search..."
          className="pl-9"
        />
      </div>

      {filters?.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilter?.(activeFilter === f.value ? "" : f.value)}
          className={`px-3.5 py-1.5 border rounded-full text-xs font-semibold transition-colors ${
            activeFilter === f.value
              ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
              : "bg-white text-gray-600 border-gray-300 hover:border-[#1a1a2e]"
          }`}
        >
          {f.label}
        </button>
      ))}

      {children}

      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="ml-auto">
          <Download className="h-4 w-4 mr-1.5" />
          Export
        </Button>
      )}
    </div>
  );
}
