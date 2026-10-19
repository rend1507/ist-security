"use client";

import { useState } from "react";
import { KeyLogTable } from "@/components/KeyLogTable";
import { KeyTransactionPanel } from "@/components/KeyTransactionPanel";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import type { KeyLogView } from "@/lib/domain";

export function KeysWorkspace({
  rows,
  canTransact,
  error,
  isSuperadmin = false,
}: {
  rows: KeyLogView[];
  canTransact: boolean;
  error: string | null;
  isSuperadmin?: boolean;
}) {
  const [openGiveCode, setOpenGiveCode] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {canTransact ? (
          <KeyTransactionPanel
            openGiveCode={openGiveCode}
            onOpenGiveHandled={() => setOpenGiveCode(null)}
          />
        ) : (
          <p className="rounded-md border-2 border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-700">
            Akun ini hanya kelola daftar kunci. Pinjam / kembalikan lewat petugas.
          </p>
        )}
        <div className="flex justify-end">
          <OfflineSyncBadge />
        </div>
      </div>

      {canTransact && (
        <ul className="list-inside list-disc space-y-1 text-base text-slate-700">
          <li>Jam diambil dari perangkat</li>
          <li>Masih dibawa → tekan tombol kembalikan</li>
          <li>Ubah jam hanya setelah dikembalikan (maks. 4×)</li>
          {isSuperadmin && (
            <li>Kolom Lama merah = lewat batas terlambat (meski sudah kembali)</li>
          )}
        </ul>
      )}

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}

      <KeyLogTable
        rows={rows}
        canTransact={canTransact}
        onReturnKey={(code) => setOpenGiveCode(code)}
      />
    </div>
  );
}
