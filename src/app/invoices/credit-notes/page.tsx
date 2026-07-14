import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CreditNotesClient } from "./client";

export default async function CreditNotesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .in("move_type", ["out_refund", "in_refund"]);

  const { data: totalResult } = await supabase
    .from("invoices")
    .select("amount_total")
    .in("move_type", ["out_refund", "in_refund"])
    .not("amount_total", "is", null);
  const totalAmount =
    totalResult?.reduce((s, r) => s + (r.amount_total ?? 0), 0) ?? 0;

  return (
    <>
      <Header title="Credit Notes" userEmail={user?.email} />
      <CreditNotesClient totalCount={count ?? 0} totalAmount={totalAmount} />
    </>
  );
}
