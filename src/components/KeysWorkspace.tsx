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
}: {
  rows: KeyLogView[];
  canTransact: boolean;
  error: string | null;
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
            Akun Admin Data hanya mengelola daftar. Pinjam / kembalikan kunci
            dilakukan petugas, Kepala, atau Super Admin.
          </p>
        )}
        <div className="flex justify-end">
          <OfflineSyncBadge />
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Jam dari perangkat. Kunci yang masih dibawa: tombol kembalikan. Ubah jam
        hanya setelah sudah dikembalikan (maks. 4×).
      </p>

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
