"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, LogOut } from "lucide-react";
import { useCompany } from "@/lib/company-context";
import type { Company } from "@/lib/company-context";

export function Header({
  title,
  userEmail,
}: {
  title: string;
  userEmail?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { company, setCompany } = useCompany();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
      <h1 className="text-xl font-bold text-[#1a1a2e]">{title}</h1>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-gray-500" />
        <select
          value={company}
          onChange={(e) => {
            setCompany(e.target.value as Company);
            router.refresh();
          }}
          className="bg-gray-50 border border-gray-200 rounded-md text-sm px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="all">All Companies</option>
          <option value="Al-Faytri Trading">Al-Faytri Trading</option>
          <option value="Al-Faytri Maintenance">Al-Faytri Maintenance</option>
        </select>
      </div>
      {userEmail && (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-200 text-gray-700 font-medium">
              {userEmail.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-500">{userEmail}</span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
