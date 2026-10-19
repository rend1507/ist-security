"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import {
  btnCancel,
  btnNeutral,
  btnPrimary,
  pillActive,
  pillIdle,
  toolbarGroup,
} from "@/lib/ui";

type Tab = "keys" | "borrowers";

type KeyRow = {
  id: number;
  code: string;
  jenis: string;
  barcode: string;
  overdue_minutes: number | null;
  status: string;
};

type BorrowerRow = {
  id: number;
  name: string;
  display_name: string;
  divisi: string;
};

export function DataMasterPanel({
  canSetOverdue = false,
}: {
  canSetOverdue?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("keys");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [kCode, setKCode] = useState("");
  const [kJenis, setKJenis] = useState("");
  const [kBarcode, setKBarcode] = useState("");
  const [kOverdue, setKOverdue] = useState("");
  const [editKeyId, setEditKeyId] = useState<number | null>(null);

  const [bDisplay, setBDisplay] = useState("");
  const [bDivisi, setBDivisi] = useState("");
  const [editBorrowerId, setEditBorrowerId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "keys") {
        const res = await fetch("/api/keys?mode=master");
        const json = (await res.json()) as {
          ok: boolean;
          data?: KeyRow[];
          error?: string;
        };
        if (!json.ok) throw new Error(json.error || "Gagal memuat kunci");
        setKeys(json.data ?? []);
      } else {
        const res = await fetch("/api/borrowers?mode=master");
        const json = (await res.json()) as {
          ok: boolean;
          data?: BorrowerRow[];
          error?: string;
        };
        if (!json.ok) throw new Error(json.error || "Gagal memuat peminjam");
        setBorrowers(json.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetKeyForm() {
    setEditKeyId(null);
    setKCode("");
    setKJenis("");
    setKBarcode("");
    setKOverdue("");
  }

  function resetBorrowerForm() {
    setEditBorrowerId(null);
    setBDisplay("");
    setBDivisi("");
  }

  function openAddKey() {
    resetKeyForm();
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  function openEditKey(k: KeyRow) {
    setEditKeyId(k.id);
    setKCode(k.code);
    setKJenis(k.jenis);
    setKBarcode(k.barcode);
    setKOverdue(
      k.overdue_minutes != null ? String(k.overdue_minutes) : ""
    );
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  function openAddBorrower() {
    resetBorrowerForm();
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  function openEditBorrower(b: BorrowerRow) {
    setEditBorrowerId(b.id);
    setBDisplay(b.display_name || b.name);
    setBDivisi(b.divisi);
    setMsg(null);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    resetKeyForm();
    resetBorrowerForm();
  }

  async function saveKey() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const overduePayload =
        canSetOverdue && kOverdue.trim() !== ""
          ? { overdue_minutes: Number(kOverdue) }
          : canSetOverdue && editKeyId != null && kOverdue.trim() === ""
            ? { overdue_minutes: null }
            : {};
      const body =
        editKeyId == null
          ? {
              code: kCode,
              jenis: kJenis,
              barcode: kBarcode || kCode,
              ...overduePayload,
            }
          : {
              id: editKeyId,
              code: kCode,
              jenis: kJenis,
              barcode: kBarcode || kCode,
              ...overduePayload,
            };
      const res = await fetch("/api/keys", {
        method: editKeyId == null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menyimpan kunci");
        return;
      }
      setMsg(editKeyId == null ? "Kunci ditambahkan." : "Kunci diperbarui.");
      closeForm();
      await load();
    } catch {
      setError("Tidak bisa terhubung.");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateKey(id: number) {
    if (!window.confirm("Nonaktifkan kunci ini dari daftar aktif?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deactivate: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menonaktifkan");
        return;
      }
      setMsg("Kunci dinonaktifkan.");
      await load();
    } finally {
      setLoading(false);
    }
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
      closeForm();
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

  const keyFormTitle = editKeyId == null ? "Tambah kunci" : "Ubah kunci";
  const borrowerFormTitle =
    editBorrowerId == null ? "Tambah peminjam" : "Ubah peminjam";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={toolbarGroup}>
          <button
            type="button"
            onClick={() => {
              setTab("keys");
              setMsg(null);
              setError(null);
              closeForm();
            }}
            className={tab === "keys" ? pillActive : pillIdle}
          >
            Jenis kunci
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("borrowers");
              setMsg(null);
              setError(null);
              closeForm();
            }}
            className={tab === "borrowers" ? pillActive : pillIdle}
          >
            Nama peminjam
          </button>
        </div>
        <button
          type="button"
          onClick={tab === "keys" ? openAddKey : openAddBorrower}
          className={btnNeutral}
        >
          <IconPlus />
          {tab === "keys" ? "Tambah kunci" : "Tambah peminjam"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </p>
      )}

      {tab === "keys" ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-200">
              <tr>
                <th className="px-3 py-2">Kode</th>
                <th className="px-3 py-2">Jenis</th>
                <th className="px-3 py-2">Barcode</th>
                {canSetOverdue && (
                  <th className="px-3 py-2">Terlambat (mnt)</th>
                )}
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{k.code}</td>
                  <td className="px-3 py-2">{k.jenis}</td>
                  <td className="px-3 py-2 font-mono text-xs">{k.barcode}</td>
                  {canSetOverdue && (
                    <td className="px-3 py-2 font-mono text-xs">
                      {k.overdue_minutes ?? "default"}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs">
                    {k.status === "out" ? "Masih dibawa" : "Siap"}
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-blue-800 underline"
                        onClick={() => openEditKey(k)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-rose-800 underline"
                        onClick={() => deactivateKey(k.id)}
                      >
                        Nonaktifkan
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase text-slate-200">
              <tr>
                <th className="px-3 py-2">Nama</th>
                <th className="px-3 py-2">Divisi</th>
                <th className="px-3 py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{b.name}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {b.divisi || "—"}
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-blue-800 underline"
                        onClick={() => openEditBorrower(b)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer font-semibold text-rose-800 underline"
                        onClick={() => deactivateBorrower(b.id)}
                      >
                        Nonaktifkan
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && tab === "keys" && (
        <Modal title={keyFormTitle} onClose={closeForm}>
          <div className="space-y-3">
            <label className="block text-sm text-slate-700">
              Kode
              <input
                value={kCode}
                onChange={(e) => setKCode(e.target.value.toUpperCase())}
                placeholder="SEC47"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Jenis kunci (disimpan huruf kecil)
              <input
                value={kJenis}
                onChange={(e) => setKJenis(e.target.value)}
                placeholder="contoh: kunci gudang"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm lowercase"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Barcode (kosong = sama dengan kode)
              <input
                value={kBarcode}
                onChange={(e) => setKBarcode(e.target.value.toUpperCase())}
                placeholder="SEC47"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
              />
            </label>
            {canSetOverdue && (
              <label className="block text-sm text-slate-700">
                Batas terlambat (menit, kosong = default global)
                <input
                  type="number"
                  min={1}
                  value={kOverdue}
                  onChange={(e) => setKOverdue(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                />
              </label>
            )}
            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={saveKey}
                className={btnPrimary}
              >
                {loading ? "Menyimpan…" : "Simpan"}
              </button>
              <button type="button" onClick={closeForm} className={btnCancel}>
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}

      {formOpen && tab === "borrowers" && (
        <Modal title={borrowerFormTitle} onClose={closeForm}>
          <div className="space-y-3">
            <label className="block text-sm text-slate-700">
              Nama
              <input
                value={bDisplay}
                onChange={(e) => setBDisplay(e.target.value)}
                placeholder="Nama lengkap"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Divisi / keterangan
              <input
                value={bDivisi}
                onChange={(e) => setBDivisi(e.target.value)}
                placeholder="IST, DRIVER, …"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={saveBorrower}
                className={btnPrimary}
              >
                {loading ? "Menyimpan…" : "Simpan"}
              </button>
              <button type="button" onClick={closeForm} className={btnCancel}>
                Batal
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
