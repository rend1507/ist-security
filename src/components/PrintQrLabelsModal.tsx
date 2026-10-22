"use client";

import { useMemo, useState } from "react";
import { IconPrint } from "@/components/Icons";
import { Modal } from "@/components/Modal";
import {
  openQrLabelPrint,
  type QrLabelKey,
} from "@/lib/print-qr-labels";
import {
  alertError,
  btnCancel,
  btnPrimary,
  btnSuccess,
  textBody,
  textLabel,
} from "@/lib/ui";

type KeyOption = QrLabelKey & { id: number };

export function PrintQrLabelsModal({
  keys,
  onClose,
}: {
  keys: KeyOption[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(keys.map((k) => k.id))
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toUpperCase();
    if (!needle) return keys;
    return keys.filter(
      (k) =>
        k.code.includes(needle) ||
        k.jenis.toUpperCase().includes(needle)
    );
  }, [keys, q]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((k) => selected.has(k.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const k of filtered) next.delete(k.id);
      } else {
        for (const k of filtered) next.add(k.id);
      }
      return next;
    });
  }

  async function onPrint() {
    setError(null);
    setBusy(true);
    try {
      const chosen = keys.filter((k) => selected.has(k.id));
      await openQrLabelPrint(chosen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuka cetak");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Cetak QR kunci (batch)" onClose={onClose} wide>
      <p className={textBody}>
        Pilih beberapa atau semua, lalu cetak / simpan PDF.
      </p>

      <label className={textLabel}>
        Cari nama / jenis
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Contoh: SEC1"
          className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono text-base uppercase"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSuccess}
          onClick={toggleAllFiltered}
          disabled={filtered.length === 0}
        >
          {allFilteredSelected ? "Hapus pilihan (daftar ini)" : "Pilih semua (daftar ini)"}
        </button>
        <p className="text-base font-semibold text-slate-700">
          Terpilih: {selected.size} / {keys.length}
        </p>
      </div>

      <ul className="max-h-72 overflow-auto rounded-md border-2 border-slate-300 bg-white">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-base text-slate-500">
            Tidak ada kunci yang cocok.
          </li>
        ) : (
          filtered.map((k) => (
            <li key={k.id} className="border-b border-slate-200 last:border-b-0">
              <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 text-base hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-blue-700"
                  checked={selected.has(k.id)}
                  onChange={() => toggle(k.id)}
                />
                <span className="min-w-0">
                  <span className="font-mono font-bold text-slate-900">
                    {k.code}
                  </span>
                  <span className="mt-0.5 block text-slate-700">{k.jenis}</span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>

      {error && <p className={alertError}>{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => void onPrint()}
          className={btnPrimary}
        >
          <IconPrint />
          {busy ? "Menyiapkan…" : "Cetak / simpan PDF"}
        </button>
        <button type="button" onClick={onClose} className={btnCancel}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}
