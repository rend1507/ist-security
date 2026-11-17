import { AppShell } from "@/components/AppShell";
import { BackupRestorePanel } from "@/components/BackupRestorePanel";
import { requirePageUser } from "@/lib/require-page-user";
import { canBackupRestore } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cadangan & pulih" };

export default async function BackupRestorePage() {
  const user = await requirePageUser();
  if (!canBackupRestore(user.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Cadangan & pulih" active="backup" user={user}>
      <BackupRestorePanel />
    </AppShell>
  );
}
