"use client";

import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { AmountCell } from "./amount-cell";
import { formatDate } from "@/lib/constants";

interface AccordionCardProps {
  id: number;
  name: string;
  partner: string;
  date: string;
  amount: number;
  status: string;
  isOpen: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  extraMeta?: { label: string; value: string }[];
}

export function AccordionCard({
  name,
  partner,
  date,
  amount,
  status,
  isOpen,
  onToggle,
  children,
  extraMeta,
}: AccordionCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden transition-shadow hover:shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="px-5 py-4 cursor-pointer flex items-center gap-4 flex-wrap hover:bg-gray-50 select-none"
      >
        <ChevronRight
          className={`h-3 w-3 text-gray-400 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span className="font-bold text-[15px] text-[#1a1a2e] min-w-[110px] flex-shrink-0">
          {name}
        </span>
        <span className="text-sm text-gray-600 flex-1 min-w-[150px]">
          {partner}
        </span>
        <div className="flex items-center gap-5 flex-shrink-0">
          {extraMeta?.map((m) => (
            <span key={m.label} className="text-sm text-gray-500">
              {m.value}
            </span>
          ))}
          <span className="text-sm text-gray-500">{formatDate(date)}</span>
          <AmountCell amount={amount} />
          <StatusBadge status={status} />
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100">{children}</div>
      )}
    </div>
  );
}
