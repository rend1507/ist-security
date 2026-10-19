import { AppShell } from "@/components/AppShell";
import { DashboardPanel } from "@/components/DashboardPanel";
import { getDashboardStats } from "@/lib/keys";
import { requirePageUser } from "@/lib/require-page-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ringkasan" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  let initial: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
  try {
    initial = await getDashboardStats();
  } catch {
    initial = null;
  }

  return (
    <AppShell title="Ringkasan harian" active="dashboard" user={user}>
      <DashboardPanel initial={initial} />
    </AppShell>
  );
}
