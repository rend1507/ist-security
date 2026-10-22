"use client";

import { useCallback, useEffect, useState } from "react";
import { IconPlus, IconPrint } from "@/components/Icons";
import { KeyCodesModal, type KeyCodesInfo } from "@/components/KeyCodesModal";
import { Modal } from "@/components/Modal";
import { PrintQrLabelsModal } from "@/components/PrintQrLabelsModal";
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

type KeyRow = {
  id: number;
  code: string;
  jenis: string;
  barcode: string;
  overdue_minutes: number | null;
  status: string;
};

export function DaftarKunciPanel({
  canSetOverdue = false,
}: {
  canSetOverdue?: boolean;
}) {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [codesInfo, setCodesInfo] = useState<KeyCodesInfo | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const [kCode, setKCode] = useState("");
  const [kJenis, setKJenis] = useState("");
  const [kOverdue, setKOverdue] = useState("");
  const [editKeyId, setEditKeyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/keys?mode=master");
      const json = (await res.json()) as {
        ok: boolean;
        data?: KeyRow[];
        error?: string;
      };
      if (!json.ok) throw new Error(json.error || "Gagal memuat kunci");
      setKeys(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditKeyId(null);
    setKCode("");
    setKJenis("");
    setKOverdue("");
  }

  function openAdd() {
    resetForm();
    setMsg(null);
    setError(null);
    setFormError(null);
    setFormMsg(null);
    setFormOpen(true);
  }

  function openEdit(k: KeyRow) {
    setEditKeyId(k.id);
    setKCode(k.code);
    setKJenis(k.jenis);
    setKOverdue(
      k.overdue_minutes != null ? String(k.overdue_minutes) : ""
    );
    setMsg(null);
    setError(null);
    setFormError(null);
    setFormMsg(null);
    setFormOpen(true);
  }

  async function saveKey() {
    setLoading(true);
    setError(null);
    setMsg(null);
    setFormError(null);
    setFormMsg(null);
    try {
      const payload: Record<string, unknown> = {
        code: kCode,
        jenis: kJenis,
      };
      if (canSetOverdue) {
        payload.overdue_minutes =
          kOverdue.trim() === "" ? null : Number(kOverdue);
      }
      const res = await fetch("/api/keys", {
        method: editKeyId == null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editKeyId == null ? payload : { id: editKeyId, ...payload }
        ),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { code: string; jenis: string; barcode: string };
      };
      if (!json.ok) {
        const err = json.error || "Gagal menyimpan";
        setFormError(err);
        setError(err);
        return;
      }
      const okText =
        editKeyId == null
          ? "Kunci ditambah. QR otomatis dibuat."
          : "Kunci diperbarui.";
      setFormMsg(okText);
      setMsg(okText);
      await load();
      window.setTimeout(() => {
        setFormOpen(false);
        resetForm();
        setFormMsg(null);
        if (json.data?.barcode) {
          setCodesInfo({
            code: json.data.code,
            jenis: json.data.jenis,
            barcode: json.data.barcode,
          });
        }
      }, 700);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateToken(k: KeyRow) {
    if (
      !window.confirm(
        `Buat ulang QR untuk ${k.code}? Label lama tidak berlaku.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: k.id, regenerate_token: true }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { code: string; jenis: string; barcode: string };
      };
      if (!json.ok) {
        setError(json.error || "Gagal membuat ulang token");
        return;
      }
      setMsg("QR baru dibuat.");
      await load();
      if (json.data) {
        setCodesInfo({
          code: json.data.code,
          jenis: json.data.jenis,
          barcode: json.data.barcode,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: number, code: string) {
    if (!window.confirm(`Nonaktifkan kunci ${code}?`)) return;
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

  return (
    <div className="space-y-4">
      <div className={toolbarGroup}>
        <button type="button" onClick={openAdd} className={btnNeutral}>
          <IconPlus />
          Tambah kunci
        </button>
        <button
          type="button"
          onClick={() => setPrintOpen(true)}
          disabled={keys.length === 0}
          className={btnSuccess}
        >
          <IconPrint />
          Cetak QR (batch)
        </button>
      </div>

      {error && <p className={alertError}>{error}</p>}
      {msg && <p className={alertOk}>{msg}</p>}

      <div className={tableShell}>
        <table className="min-w-full text-left text-base">
          <thead className={tableHead}>
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Jenis</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Belum ada kunci. Tambah kunci baru.
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-mono font-bold text-blue-800 hover:underline"
                      onClick={() =>
                        setCodesInfo({
                          code: k.code,
                          jenis: k.jenis,
                          barcode: k.barcode,
                        })
                      }
                    >
                      {k.code}
                    </button>
                  </td>
                  <td className="px-3 py-2">{k.jenis}</td>
                  <td className="px-3 py-2.5 text-base">
                    {k.status === "out" ? "Sedang dibawa" : "Siap"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${btnPrimary} ${btnRow}`}
                        onClick={() =>
                          setCodesInfo({
                            code: k.code,
                            jenis: k.jenis,
                            barcode: k.barcode,
                          })
                        }
                      >
                        Kode
                      </button>
                      <button
                        type="button"
                        className={`${btnNeutral} ${btnRow}`}
                        onClick={() => openEdit(k)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className={`${btnNeutral} ${btnRow}`}
                        onClick={() => void regenerateToken(k)}
                        disabled={loading}
                      >
                        Buat QR baru
                      </button>
                      <button
                        type="button"
                        className={`${btnDanger} ${btnRow}`}
                        onClick={() => void deactivate(k.id, k.code)}
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
          title={editKeyId == null ? "Tambah kunci" : "Ubah kunci"}
          onClose={() => {
            setFormOpen(false);
            resetForm();
          }}
        >
          <div className="space-y-3">
            <label className={textLabel}>
              Nama kunci (huruf besar, unik)
              <input
                value={kCode}
                onChange={(e) => setKCode(e.target.value.toUpperCase())}
                placeholder="CONTOH: SEC47"
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono text-base uppercase"
              />
            </label>
            <label className={textLabel}>
              Jenis
              <input
                value={kJenis}
                onChange={(e) => setKJenis(e.target.value.toUpperCase())}
                placeholder="CONTOH: LOKER A"
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 text-base uppercase"
              />
            </label>
            {canSetOverdue && (
              <label className={textLabel}>
                Batas terlambat (menit, opsional)
                <input
                  type="number"
                  min={1}
                  value={kOverdue}
                  onChange={(e) => setKOverdue(e.target.value)}
                  className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono text-base"
                />
              </label>
            )}
            {editKeyId == null && (
              <p className="text-base text-slate-700">
                QR Code akan dibuat otomatis setelah disimpan.
              </p>
            )}
            {formError && <p className={alertError}>{formError}</p>}
            {formMsg && <p className={alertOk}>{formMsg}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void saveKey()}
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

      {codesInfo && (
        <KeyCodesModal
          info={codesInfo}
          onClose={() => setCodesInfo(null)}
        />
      )}

      {printOpen && (
        <PrintQrLabelsModal
          keys={keys.map((k) => ({
            id: k.id,
            code: k.code,
            jenis: k.jenis,
            barcode: k.barcode,
          }))}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
