import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AccountingClient } from "./client";

export default async function AccountingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header title="Payments" userEmail={user?.email} />
      <AccountingClient totalCount={count ?? 0} />
    </>
  );
}
