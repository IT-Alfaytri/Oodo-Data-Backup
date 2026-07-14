import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { EmployeesClient } from "./client";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Employees" userEmail={session?.user?.email} />
      <EmployeesClient />
    </>
  );
}
