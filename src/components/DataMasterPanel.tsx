"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import {
  btnCancel,
  btnDanger,
  btnNeutral,
  btnPrimary,
  btnSuccess,
} from "@/lib/ui";

type BorrowerRow = {
  id: number;
  name: string;
  display_name: string;
  divisi: string;
};

/** Data Master — hanya daftar peminjam. Kunci ada di menu Daftar kunci. */
export function DataMasterPanel() {
  const [borrowers, setBorrowers] = useState<BorrowerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [bDisplay, setBDisplay] = useState("");
  const [bDivisi, setBDivisi] = useState("");
  const [editBorrowerId, setEditBorrowerId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/borrowers?mode=master");
      const json = (await res.json()) as {
        ok: boolean;
        data?: BorrowerRow[];
        error?: string;
      };
      if (!json.ok) throw new Error(json.error || "Gagal memuat peminjam");
      setBorrowers(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditBorrowerId(null);
    setBDisplay("");
    setBDivisi("");
  }

  function openAdd() {
    resetForm();
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(b: BorrowerRow) {
    setEditBorrowerId(b.id);
    setBDisplay(b.display_name || b.name);
    setBDivisi(b.divisi);
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  async function saveBorrower() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const body =
        editBorrowerId == null
          ? { display_name: bDisplay, divisi: bDivisi }
          : {
              id: editBorrowerId,
              display_name: bDisplay,
              divisi: bDivisi,
            };
      const res = await fetch("/api/borrowers", {
        method: editBorrowerId == null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menyimpan peminjam");
        return;
      }
      setMsg(
        editBorrowerId == null
          ? "Peminjam ditambahkan."
          : "Peminjam diperbarui."
      );
      setFormOpen(false);
      resetForm();
      await load();
    } catch {
      setError("Tidak bisa terhubung.");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateBorrower(id: number) {
    if (!window.confirm("Nonaktifkan nama peminjam ini dari daftar aktif?")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/borrowers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deactivate: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menonaktifkan");
        return;
      }
      setMsg("Peminjam dinonaktifkan.");
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={openAdd} className={btnSuccess}>
          <IconPlus />
          Tambah peminjam
        </button>
      </div>

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-base text-emerald-950">
          {msg}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border-2 border-slate-300 bg-white">
        <table className="min-w-full text-left text-base">
          <thead className="bg-slate-200 text-sm font-bold uppercase text-slate-800">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Divisi</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Belum ada peminjam.
                </td>
              </tr>
            ) : (
              borrowers.map((b) => (
                <tr key={b.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold">
                    {b.display_name || b.name}
                  </td>
                  <td className="px-3 py-2">{b.divisi || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${btnNeutral} !px-3 !py-1.5 text-sm`}
                        onClick={() => openEdit(b)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={`${btnDanger} !px-3 !py-1.5 text-sm`}
                        onClick={() => void deactivateBorrower(b.id)}
                      >
                        Nonaktif
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <Modal
          title={
            editBorrowerId == null ? "Tambah peminjam" : "Ubah peminjam"
          }
          onClose={() => {
            setFormOpen(false);
            resetForm();
          }}
        >
          <div className="space-y-3">
            <label className="block text-base font-semibold">
              Nama
              <input
                value={bDisplay}
                onChange={(e) => setBDisplay(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base uppercase"
              />
            </label>
            <label className="block text-base font-semibold">
              Divisi
              <input
                value={bDivisi}
                onChange={(e) => setBDivisi(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base uppercase"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveBorrower()}
                className={btnPrimary}
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className={btnCancel}
              >
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
