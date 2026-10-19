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
      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Kelola daftar jenis kunci dan nama peminjam. Tambah / ubah lewat popup.
        Jenis kunci disimpan huruf kecil. Nonaktifkan jika tidak dipakai lagi
        (riwayat pinjam tetap tersimpan).
      </p>
      <DataMasterPanel canSetOverdue={canSetOverdue(user.role)} />
    </AppShell>
  );
}
