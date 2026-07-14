import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { StockMovementsClient } from "./client";

export default async function StockMovementsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Stock Movements" userEmail={session?.user?.email} />
      <StockMovementsClient />
    </>
  );
}
