import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomersClient } from "./client";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Customers" userEmail={session?.user?.email} />
      <CustomersClient />
    </>
  );
}
