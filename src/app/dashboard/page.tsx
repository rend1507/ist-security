import { AppShell } from "@/components/AppShell";
import { DashboardPanel } from "@/components/DashboardPanel";
import { getDashboardStats } from "@/lib/keys";
import { canSetOverdue, canTransact } from "@/lib/roles";
import { requirePageUser } from "@/lib/require-page-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  let initial: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  try {
    initial = await getDashboardStats();
  } catch {
    initial = null;
  }

  return (
    <AppShell title="Dashboard" active="dashboard" user={user}>
      <DashboardPanel
        initial={initial}
        isSuperadmin={user.role === "superadmin"}
        canEditOverdue={canSetOverdue(user.role)}
        canTransact={canTransact(user.role)}
      />
    </AppShell>
  );
}
