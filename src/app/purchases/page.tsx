import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { PurchasesClient } from "./client";

export default async function PurchasesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Purchase Orders" userEmail={session?.user?.email} />
      <PurchasesClient />
    </>
  );
}
