import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { VendorBillsClient } from "./client";

export default async function VendorBillsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Vendor Bills" userEmail={session?.user?.email} />
      <VendorBillsClient />
    </>
  );
}
