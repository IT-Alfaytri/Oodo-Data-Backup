import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ProductsClient } from "./client";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("product_templates")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header title="Products" userEmail={user?.email} />
      <ProductsClient totalCount={count ?? 0} />
    </>
  );
}
