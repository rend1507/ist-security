import { AppShell } from "@/components/AppShell";
import { DataMasterPanel } from "@/components/DataMasterPanel";
import { requirePageUser } from "@/lib/require-page-user";
import { canManageMaster, canSetOverdue } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data Master" };

export default async function AdminMasterPage() {
  const user = await requirePageUser();
  if (!canManageMaster(user.role)) {
    redirect("/dashboard");
  }

  return (
    <AppShell title="Data Master" active="master" user={user}>
      <ul className="mb-4 list-inside list-disc space-y-1 text-base text-slate-700">
        <li>Tambah / ubah lewat popup</li>
        <li>Jenis kunci huruf kecil</li>
        <li>Nonaktifkan = hilang dari daftar (riwayat tetap ada)</li>
      </ul>
      <DataMasterPanel canSetOverdue={canSetOverdue(user.role)} />
    </AppShell>
  );
}
