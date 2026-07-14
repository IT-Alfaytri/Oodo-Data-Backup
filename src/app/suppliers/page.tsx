import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SuppliersClient } from "./client";

export default async function SuppliersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Suppliers" userEmail={session?.user?.email} />
      <SuppliersClient />
    </>
  );
}
