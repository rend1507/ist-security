import { AppShell } from "@/components/AppShell";
import { DaftarKunciPanel } from "@/components/DaftarKunciPanel";
import { requirePageUser } from "@/lib/require-page-user";
import { canManageMaster, canSetOverdue } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daftar kunci" };

export default async function DaftarKunciPage() {
  const user = await requirePageUser();
  if (!canManageMaster(user.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Daftar kunci" active="daftar" user={user}>
      <DaftarKunciPanel canSetOverdue={canSetOverdue(user.role)} />
    </AppShell>
  );
}
