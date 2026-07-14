import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { InventoryClient } from "./client";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Inventory" userEmail={session?.user?.email} />
      <InventoryClient />
    </>
  );
}
