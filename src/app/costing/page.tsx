import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CostingClient } from "./client";

export default async function CostingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Costing" userEmail={session?.user?.email} />
      <CostingClient />
    </>
  );
}
