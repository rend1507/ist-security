"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { MAX_EDITS } from "@/lib/domain";
import { btnCancel, btnPrimary } from "@/lib/ui";

function toDatetimeLocal(sql: string | null): string {
  if (!sql) return "";
  return sql.trim().replace(" ", "T").slice(0, 16);
}

function fromDatetimeLocal(v: string): string {
  if (!v) return "";
  const base = v.replace("T", " ");
  return base.length === 16 ? `${base}:00` : base;
}

export function EditTimeModal({
  logId,
  code,
  takeOut,
  giveBack,
  editCount,
  onClose,
}: {
  logId: number;
  code: string;
  takeOut: string | null;
  giveBack: string | null;
  editCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const remaining = Math.max(0, MAX_EDITS - editCount);
  const [take, setTake] = useState(toDatetimeLocal(takeOut));
  const [give, setGive] = useState(toDatetimeLocal(giveBack));
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (pin.length !== 6) {
      setError("PIN akun harus 6 angka.");
      return;
    }
    if (!take) {
      setError("Jam diambil wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/transactions/edit-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          logId,
          takeOutAt: fromDatetimeLocal(take),
          giveBackAt: give ? fromDatetimeLocal(give) : null,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { remaining: number };
      };
      if (!json.ok) {
        setError(json.error || "Gagal mengubah jam.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Tidak bisa terhubung.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title={`Ubah jam — ${code}`} onClose={onClose}>
      <p className="mb-3 text-base text-slate-700">
        Sisa ubah: {remaining}× (maks. {MAX_EDITS}×)
      </p>

      {remaining <= 0 ? (
        <p className="rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-base text-amber-950">
          Kuota ubah jam sudah habis. Hubungi Kepala Security.
        </p>
      ) : (
        <div className="space-y-3">
          <label className="block text-base font-semibold text-slate-800">
            Jam diambil
            <input
              type="datetime-local"
              value={take}
              onChange={(e) => setTake(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base"
            />
          </label>
          <label className="block text-base font-semibold text-slate-800">
            Jam dikembalikan (kosong = masih dibawa)
            <input
              type="datetime-local"
              value={give}
              onChange={(e) => setGive(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base"
            />
          </label>
          <label className="block text-base font-semibold text-slate-800">
            PIN akun (6 angka)
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono tracking-widest"
            />
          </label>
          {error && (
            <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className={btnPrimary}
            >
              {loading ? "Menyimpan…" : "Simpan"}
            </button>
            <button type="button" onClick={onClose} className={btnCancel}>
              Batal
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
