import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ReportsClient } from "./client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  return (
    <>
      <Header title="Reports" userEmail={user?.email} />
      <ReportsClient />
    </>
  );
}
