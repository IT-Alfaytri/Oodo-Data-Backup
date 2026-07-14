import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Odoo Data Viewer - Al-Faytri Trading",
  description: "Historical Odoo data viewer for Al-Faytri Trading",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = !user;

  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#f5f6f8]`}>
        {isLoginPage ? (
          children
        ) : (
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 md:ml-[220px] min-w-0">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
