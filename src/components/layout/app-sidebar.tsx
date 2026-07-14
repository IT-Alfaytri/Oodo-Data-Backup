"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, Factory,
  Calculator, FileText, Receipt, FileX, Warehouse, ArrowLeftRight,
  DollarSign, Briefcase, Menu, X,
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ShoppingCart, Truck, Package, Users, Factory,
  Calculator, FileText, Receipt, FileX, Warehouse, ArrowLeftRight,
  DollarSign, Briefcase, Menu, X,
};

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#1a1a2e] text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[220px] bg-[#1a1a2e] text-gray-400 z-50 overflow-y-auto transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#2a2a4e]">
          <h2 className="text-sm font-semibold text-white tracking-wider uppercase">
            Odoo Data
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium border-l-[3px] transition-colors ${
                  isActive
                    ? "text-white bg-[#1a1a2e] border-white"
                    : "border-transparent hover:text-white hover:bg-[#2a2a4e]"
                }`}
              >
                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
