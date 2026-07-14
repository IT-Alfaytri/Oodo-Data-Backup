import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { StockMovementsClient } from "./client";

export default async function StockMovementsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("stock_pickings")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header title="Stock Movements" userEmail={user?.email} />
      <StockMovementsClient totalCount={count ?? 0} />
    </>
  );
}
