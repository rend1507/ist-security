"use client";

import { useMemo, useState } from "react";
import { IconPrint } from "@/components/Icons";
import {
  buildQrLabels,
  type QrLabelKey,
  type QrLabelReady,
} from "@/lib/print-qr-labels";
import { todayWibDate } from "@/lib/dates";
import { daftarKunciPdfTitle, printWithTitle } from "@/lib/print-title";
import { uiAlert } from "@/lib/public-error";
import {
  alertError,
  btnCancel,
  btnPrimary,
  btnSuccess,
  textBody,
  textLabel,
  toolbarGroup,
} from "@/lib/ui";

type KeyOption = QrLabelKey & { id: number };

/**
 * Cetak QR di halaman yang sama (bukan popup).
 * Pilih kunci → tampilkan label → Cetak / simpan PDF · Kembali.
 */
export function PrintQrLabelsPanel({
  keys,
  onBack,
}: {
  keys: KeyOption[];
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<"select" | "preview">("select");
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(keys.map((k) => k.id))
  );
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<QrLabelReady[]>([]);

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

  async function goPreview() {
    setError(null);
    setBusy(true);
    try {
      const chosen = keys.filter((k) => selected.has(k.id));
      const ready = await buildQrLabels(chosen);
      setLabels(ready);
      setPhase("preview");
    } catch (e) {
      uiAlert(setError, "Gagal menyiapkan QR.", e);
    } finally {
      setBusy(false);
    }
  }

  if (phase === "preview") {
    return (
      <div className="space-y-4">
        <div className={`${toolbarGroup} print:hidden`}>
          <button type="button" onClick={() => setPhase("select")} className={btnCancel}>
            Kembali
          </button>
          <button
            type="button"
            onClick={() => printWithTitle(daftarKunciPdfTitle(todayWibDate()))}
            className={btnPrimary}
          >
            <IconPrint />
            Cetak / simpan PDF
          </button>
          <p className="text-base font-semibold text-slate-700">
            {labels.length} label · kartu 20×26 mm · QR 16 mm
          </p>
        </div>

        <div id="qr-print-root" className="qr-print-sheet rounded-lg border-2 border-slate-300 bg-white p-3 print:border-0 print:p-0">
          <div className="qr-print-grid">
            {labels.map((l) => (
              <article key={`${l.code}-${l.barcode}`} className="qr-print-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.dataUrl} alt={`QR ${l.code}`} width={256} height={256} />
                <p className="qr-print-code">{l.code}</p>
                <p className="qr-print-jenis">{l.jenis || "—"}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={toolbarGroup}>
        <button type="button" onClick={onBack} className={btnCancel}>
          Kembali
        </button>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() => void goPreview()}
          className={btnPrimary}
        >
          <IconPrint />
          {busy ? "Menyiapkan…" : "Tampilkan label"}
        </button>
        <p className="text-base font-semibold text-slate-700">
          Terpilih: {selected.size} / {keys.length}
        </p>
      </div>

      <p className={textBody}>
        Pilih beberapa atau semua, lalu tampilkan label di halaman ini (tanpa
        popup).
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
          {allFilteredSelected
            ? "Hapus pilihan (daftar ini)"
            : "Pilih semua (daftar ini)"}
        </button>
      </div>

      <ul className="max-h-[min(28rem,60vh)] overflow-auto rounded-md border-2 border-slate-300 bg-white">
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
    </div>
  );
}
