import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { InventoryClient } from "./client";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("stock_quants")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header title="Inventory" userEmail={user?.email} />
      <InventoryClient totalCount={count ?? 0} />
    </>
  );
}
