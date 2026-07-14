import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { PurchasesClient } from "./client";

export default async function PurchasesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true });

  const { data: totalResult } = await supabase
    .from("purchase_orders")
    .select("amount_total")
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Purchase Orders" userEmail={user?.email} />
      <PurchasesClient totalCount={count ?? 0} totalAmount={totalAmount} />
    </>
  );
}
