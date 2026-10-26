import { AppShell } from "@/components/AppShell";
import { SessionAccessLogPanel } from "@/components/SessionAccessLogPanel";
import { requirePageUser } from "@/lib/require-page-user";
import { canViewSessionLogs } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log akses" };

export default async function LogAksesPage() {
  const user = await requirePageUser();
  if (!canViewSessionLogs(user.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Log masuk / keluar" active="akses" user={user}>
      <SessionAccessLogPanel />
    </AppShell>
  );
}
