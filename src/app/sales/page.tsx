import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SalesClient } from "./client";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("sale_orders")
    .select("*", { count: "exact", head: true });

  const { data: totalResult } = await supabase
    .from("sale_orders")
    .select("amount_total")
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Sales Orders" userEmail={user?.email} />
      <SalesClient totalCount={count ?? 0} totalAmount={totalAmount} />
    </>
  );
}
