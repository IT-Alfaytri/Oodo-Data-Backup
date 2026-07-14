import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CreditNotesClient } from "./client";

export default async function CreditNotesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <>
      <Header title="Credit Notes" userEmail={session?.user?.email} />
      <CreditNotesClient />
    </>
  );
}
