import { AppShell } from "@/components/AppShell";
import { KeysWorkspace } from "@/components/KeysWorkspace";
import type { KeyLogView } from "@/lib/domain";
import { listKeyLogViews } from "@/lib/keys";
import { requirePageUser } from "@/lib/require-page-user";
import { canTransact } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buku kunci" };

export default async function KeysPage() {
  const user = await requirePageUser();
  let rows: KeyLogView[] = [];
  let error: string | null = null;
  try {
    const data = await listKeyLogViews();
    rows = data.rows;
  } catch (e) {
    error = e instanceof Error ? e.message : "Gagal memuat buku kunci";
  }

  return (
    <AppShell title="Buku kunci" active="keys" user={user}>
      <KeysWorkspace
        rows={rows}
        canTransact={canTransact(user.role)}
        error={error}
      />
    </AppShell>
  );
}
