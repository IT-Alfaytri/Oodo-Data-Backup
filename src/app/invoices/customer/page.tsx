import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomerInvoicesClient } from "./client";

export default async function CustomerInvoicesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("move_type", "out_invoice");

  const { data: totalResult } = await supabase
    .from("invoices")
    .select("amount_total")
    .eq("move_type", "out_invoice")
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Customer Invoices" userEmail={user?.email} />
      <CustomerInvoicesClient
        totalCount={count ?? 0}
        totalAmount={totalAmount}
      />
    </>
  );
}
