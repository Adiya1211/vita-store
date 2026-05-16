import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import SidebarClient from "@/components/SidebarClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarClient role={session.user.role} userName={session.user.name ?? ""} />
      <main className="flex-1 overflow-auto p-4 lg:p-6 pt-[calc(3.5rem+1rem)] lg:pt-6">
        {children}
      </main>
    </div>
  );
}
