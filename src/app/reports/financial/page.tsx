import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { FinancialReportsClient } from "./client";

export default async function FinancialReportsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <>
      <Header title="Financial Reports" userEmail={user?.email} />
      <FinancialReportsClient />
    </>
  );
}
