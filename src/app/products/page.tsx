import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ProductsClient } from "./client";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Products" userEmail={session?.user?.email} />
      <ProductsClient />
    </>
  );
}
