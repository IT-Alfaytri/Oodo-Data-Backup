"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Company = "Al-Faytri Trading" | "Al-Faytri Maintenance" | "all";

interface CompanyContextValue {
  company: Company;
  setCompany: (company: Company) => void;
  companyFilter: string | null;
}

const STORAGE_KEY = "selected-company";

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

function getInitialCompany(): Company {
  if (typeof window === "undefined") return "all";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "Al-Faytri Trading" || stored === "Al-Faytri Maintenance" || stored === "all") {
    return stored;
  }
  return "all";
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<Company>("all");

  useEffect(() => {
    setCompanyState(getInitialCompany());
  }, []);

  const setCompany = (value: Company) => {
    setCompanyState(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  const companyFilter = company === "all" ? null : company;

  return (
    <CompanyContext.Provider value={{ company, setCompany, companyFilter }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
