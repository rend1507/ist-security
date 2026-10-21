import { AppShell } from "@/components/AppShell";
import { DataMasterPanel } from "@/components/DataMasterPanel";
import { requirePageUser } from "@/lib/require-page-user";
import { canManageMaster } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data Master" };

export default async function AdminMasterPage() {
  const user = await requirePageUser();
  if (!canManageMaster(user.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Data Master — Peminjam" active="master" user={user}>
      <DataMasterPanel />
    </AppShell>
  );
}
