import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { VendorBillsClient } from "./client";

export default async function VendorBillsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("move_type", "in_invoice");

  const { data: totalResult } = await supabase
    .from("invoices")
    .select("amount_total")
    .eq("move_type", "in_invoice")
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Vendor Bills" userEmail={user?.email} />
      <VendorBillsClient totalCount={count ?? 0} totalAmount={totalAmount} />
    </>
  );
}
