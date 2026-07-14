import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { EmployeesClient } from "./client";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  const { count } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true });

  return (
    <>
      <Header title="Employees" userEmail={user?.email} />
      <EmployeesClient totalCount={count ?? 0} />
    </>
  );
}
