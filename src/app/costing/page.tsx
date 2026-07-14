import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CostingClient } from "./client";

export default async function CostingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("landed_costs")
    .select("*", { count: "exact", head: true });

  const { data: totalResult } = await supabase
    .from("landed_costs")
    .select("amount_total")
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Costing" userEmail={user?.email} />
      <CostingClient totalCount={count ?? 0} totalAmount={totalAmount} />
    </>
  );
}
