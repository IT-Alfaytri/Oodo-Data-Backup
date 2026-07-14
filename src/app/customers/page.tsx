import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomersClient } from "./client";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .gt("customer_rank", 0);

  return (
    <>
      <Header title="Customers" userEmail={user?.email} />
      <CustomersClient totalCount={count ?? 0} />
    </>
  );
}
