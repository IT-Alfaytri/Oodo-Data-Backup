import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AccountingClient } from "./client";

export default async function AccountingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Payments" userEmail={session?.user?.email} />
      <AccountingClient />
    </>
  );
}
