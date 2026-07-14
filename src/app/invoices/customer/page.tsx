import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomerInvoicesClient } from "./client";

export default async function CustomerInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Customer Invoices" userEmail={session?.user?.email} />
      <CustomerInvoicesClient />
    </>
  );
}
