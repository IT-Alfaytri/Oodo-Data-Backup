import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SuppliersClient } from "./client";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .gt("supplier_rank", 0);

  return (
    <>
      <Header title="Suppliers" userEmail={user?.email} />
      <SuppliersClient totalCount={count ?? 0} />
    </>
  );
}
