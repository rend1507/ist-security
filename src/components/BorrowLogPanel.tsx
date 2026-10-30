"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconPrint } from "@/components/Icons";
import { LiveDuration } from "@/components/LiveDuration";
import type { BorrowLogListRow } from "@/lib/borrow-logs";
import { todayWibDate } from "@/lib/dates";
import { durationMs } from "@/lib/domain";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  alertError,
  btnPrimary,
  btnSuccess,
  tableHead,
  tableShell,
  textLabel,
  toolbarGroup,
} from "@/lib/ui";

type SortKey =
  | "key_code"
  | "key_jenis"
  | "borrower_name"
  | "take_out_at"
  | "give_back_at"
  | "durasi"
  | "taken_by"
  | "returned_by";

const COLUMNS: { key: SortKey; label: string; printLabel: string; colClass: string }[] = [
  { key: "key_code", label: "Kunci", printLabel: "Kunci", colClass: "log-kunci-col-key" },
  { key: "key_jenis", label: "Jenis", printLabel: "Jenis", colClass: "log-kunci-col-jenis" },
  { key: "borrower_name", label: "Peminjam", printLabel: "Peminjam", colClass: "log-kunci-col-peminjam" },
  { key: "take_out_at", label: "Dipinjam", printLabel: "Pinjam", colClass: "log-kunci-col-take" },
  { key: "give_back_at", label: "Dikembalikan", printLabel: "Kembali", colClass: "log-kunci-col-give" },
  { key: "durasi", label: "Durasi", printLabel: "Durasi", colClass: "log-kunci-col-durasi" },
  { key: "taken_by", label: "Petugas pinjam", printLabel: "Ptg pinjam", colClass: "log-kunci-col-taken" },
  { key: "returned_by", label: "Petugas kembali", printLabel: "Ptg kembali", colClass: "log-kunci-col-returned" },
];

/** Jam layar penuh; cetak: `19/10 20:20` agar muat A4 portrait. */
function fmtLogWhen(raw: string | null): { screen: string; print: string } {
  if (!raw) return { screen: "—", print: "—" };
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return { screen: raw, print: raw };
  return { screen: raw, print: `${m[3]}/${m[2]} ${m[4]}:${m[5]}` };
}

function cmp(a: string | null, b: string | null) {
  return String(a ?? "").localeCompare(String(b ?? ""), "id", {
    numeric: true,
  });
}

export function BorrowLogPanel() {
  const [from, setFrom] = useState(() => todayWibDate());
  const [to, setTo] = useState(() => todayWibDate());
  const [rows, setRows] = useState<BorrowLogListRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("take_out_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async (fromYmd: string, toYmd: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ from: fromYmd, to: toYmd });
      const res = await fetch(`/api/borrow-logs?${q}`, { cache: "no-store" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { rows: BorrowLogListRow[] };
        error?: string;
      };
      if (!json.ok || !json.data) {
        uiApiAlert(setError, UI_MSG.load, res, json);
        setRows([]);
        return;
      }
      setRows(json.data.rows);
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load sekali saat mount
  }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "take_out_at" || key === "give_back_at" || key === "durasi"
          ? "desc"
          : "asc"
      );
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (sortKey === "durasi") {
        return (
          (durationMs(a.take_out_at, a.give_back_at) -
            durationMs(b.take_out_at, b.give_back_at)) *
          dir
        );
      }
      const av =
        sortKey === "borrower_name"
          ? a.borrower_name
          : (a[sortKey] as string | null);
      const bv =
        sortKey === "borrower_name"
          ? b.borrower_name
          : (b[sortKey] as string | null);
      return cmp(av, bv) * dir;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function printPdf() {
    if (sorted.length === 0) {
      setError("Tidak ada data untuk dicetak. Pilih tanggal lalu Tampilkan dulu.");
      return;
    }
    window.print();
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <div className={`${toolbarGroup} items-end print:hidden`}>
        <label className={textLabel}>
          Dari tanggal
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base"
          />
        </label>
        <label className={textLabel}>
          Sampai tanggal
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2.5 font-mono text-base"
          />
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(from, to)}
          className={btnPrimary}
        >
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        <button
          type="button"
          disabled={loading || sorted.length === 0}
          onClick={printPdf}
          className={btnSuccess}
        >
          <IconPrint />
          Cetak / PDF
        </button>
      </div>

      {error && <p className={`${alertError} print:hidden`}>{error}</p>}

      <div
        id="log-kunci-print-root"
        className="log-kunci-print-sheet rounded-lg border-2 border-slate-300 bg-white print:border-0"
      >
        <div className="log-kunci-print-header hidden border-b border-slate-300 px-3 py-3 print:block">
          <p className="text-base font-bold text-slate-900">
            IST Security — Log kunci
          </p>
          <p className="log-kunci-print-meta mt-1 font-mono text-base text-slate-700">
            {from} s/d {to} · {sorted.length} baris
          </p>
        </div>
        <div className={`${tableShell} print:overflow-visible print:border-0`}>
          <table className="min-w-full text-left text-base">
            <thead className={tableHead}>
              <tr>
                {COLUMNS.map((col) => {
                  const active = sortKey === col.key;
                  return (
                    <th key={col.key} className={`px-3 py-2.5 ${col.colClass}`}>
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex min-h-10 cursor-pointer items-center gap-1 hover:text-slate-950 print:cursor-default"
                      >
                        <span className="print:hidden">{col.label}</span>
                        <span className="hidden print:inline">{col.printLabel}</span>
                        <span
                          className="text-xs opacity-80 print:hidden"
                          aria-hidden
                        >
                          {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-base text-slate-500"
                  >
                    Tidak ada log di rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                sorted.map((r) => {
                  const take = fmtLogWhen(r.take_out_at);
                  const give = fmtLogWhen(r.give_back_at);
                  return (
                  <tr key={r.id} className="border-t border-slate-200">
                    <td className="log-kunci-col-key px-3 py-2.5 font-mono text-base font-bold">
                      {r.key_code}
                    </td>
                    <td className="log-kunci-col-jenis px-3 py-2.5 text-base">{r.key_jenis}</td>
                    <td className="log-kunci-col-peminjam px-3 py-2.5 text-base">
                      <span className="font-semibold">{r.borrower_name}</span>
                      {r.borrower_divisi ? (
                        <>
                          <span className="mt-0.5 block text-base text-slate-700 print:hidden">
                            {r.borrower_divisi}
                          </span>
                          <span className="hidden print:inline text-slate-600">
                            {" "}
                            · {r.borrower_divisi}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td className="log-kunci-col-take whitespace-nowrap px-3 py-2.5 font-mono text-base">
                      <span className="print:hidden">{take.screen}</span>
                      <span className="hidden print:inline">{take.print}</span>
                    </td>
                    <td className="log-kunci-col-give whitespace-nowrap px-3 py-2.5 font-mono text-base">
                      <span className="print:hidden">{give.screen}</span>
                      <span className="hidden print:inline">{give.print}</span>
                    </td>
                    <td className="log-kunci-col-durasi whitespace-nowrap px-3 py-2.5 font-mono text-base font-semibold">
                      <LiveDuration
                        takeOut={r.take_out_at}
                        giveBack={r.give_back_at}
                      />
                    </td>
                    <td className="log-kunci-col-taken px-3 py-2.5 text-base">
                      {r.taken_by ?? "—"}
                    </td>
                    <td className="log-kunci-col-returned px-3 py-2.5 text-base">
                      {r.returned_by ?? "—"}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
