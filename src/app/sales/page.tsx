import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SalesClient } from "./client";

export default async function SalesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Sales Orders" userEmail={session?.user?.email} />
      <SalesClient />
    </>
  );
}
