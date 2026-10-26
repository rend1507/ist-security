"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  alertError,
  alertOk,
  btnCancel,
  btnDanger,
  btnNeutral,
  btnPrimary,
  btnRow,
  btnSuccess,
  tableHead,
  tableShell,
  textLabel,
  toolbarGroup,
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
      if (!json.ok) {
        uiApiAlert(setError, UI_MSG.load, res, json);
        return;
      }
      setBorrowers(json.data ?? []);
    } catch (e) {
      uiAlert(setError, UI_MSG.load, e);
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
        uiApiAlert(setError, UI_MSG.save, res, json);
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
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
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
        uiApiAlert(setError, UI_MSG.generic, res, json);
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
      <div className={toolbarGroup}>
        <button type="button" onClick={openAdd} className={btnSuccess}>
          <IconPlus />
          Tambah peminjam
        </button>
      </div>

      {error && <p className={alertError}>{error}</p>}
      {msg && <p className={alertOk}>{msg}</p>}

      <div className={tableShell}>
        <table className="min-w-full text-left text-base">
          <thead className={tableHead}>
            <tr>
              <th className="px-3 py-2.5">Nama</th>
              <th className="px-3 py-2.5">Divisi</th>
              <th className="px-3 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-base text-slate-500"
                >
                  Belum ada peminjam.
                </td>
              </tr>
            ) : (
              borrowers.map((b) => (
                <tr key={b.id} className="border-t border-slate-200">
                  <td className="px-3 py-2.5 text-base font-semibold">
                    {b.display_name || b.name}
                  </td>
                  <td className="px-3 py-2.5 text-base">{b.divisi || "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${btnNeutral} ${btnRow}`}
                        onClick={() => openEdit(b)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={`${btnDanger} ${btnRow}`}
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
            <label className={textLabel}>
              Nama
              <input
                value={bDisplay}
                onChange={(e) => setBDisplay(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base uppercase"
              />
            </label>
            <label className={textLabel}>
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
