import { AppShell } from "@/components/AppShell";
import { BorrowLogPanel } from "@/components/BorrowLogPanel";
import { requirePageUser } from "@/lib/require-page-user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log kunci" };

export default async function LogKunciPage() {
  const user = await requirePageUser();

  return (
    <AppShell title="Log kunci" active="logs" user={user}>
      <BorrowLogPanel />
    </AppShell>
  );
}
