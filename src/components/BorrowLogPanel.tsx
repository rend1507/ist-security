"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BorrowLogListRow } from "@/lib/borrow-logs";
import { todayWibDate } from "@/lib/dates";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import {
  alertError,
  btnPrimary,
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
  | "taken_by"
  | "returned_by";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "key_code", label: "Kunci" },
  { key: "key_jenis", label: "Jenis" },
  { key: "borrower_name", label: "Peminjam" },
  { key: "take_out_at", label: "Dipinjam" },
  { key: "give_back_at", label: "Dikembalikan" },
  { key: "taken_by", label: "Petugas pinjam" },
  { key: "returned_by", label: "Petugas kembali" },
];

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
      setSortDir(key === "take_out_at" || key === "give_back_at" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
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

  return (
    <div className="space-y-4">
      <div className={`${toolbarGroup} items-end`}>
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
      </div>

      {error && <p className={alertError}>{error}</p>}

      <div className={tableShell}>
        <table className="min-w-full text-left text-base">
          <thead className={tableHead}>
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th key={col.key} className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1 hover:text-slate-950"
                    >
                      {col.label}
                      <span className="text-xs opacity-80" aria-hidden>
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
                  colSpan={7}
                  className="px-3 py-8 text-center text-base text-slate-500"
                >
                  Tidak ada log di rentang tanggal ini.
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-3 py-2.5 font-mono text-base font-bold">
                    {r.key_code}
                  </td>
                  <td className="px-3 py-2.5 text-base">{r.key_jenis}</td>
                  <td className="px-3 py-2.5 text-base">
                    <span className="font-semibold">{r.borrower_name}</span>
                    {r.borrower_divisi ? (
                      <span className="mt-0.5 block text-base text-slate-700">
                        {r.borrower_divisi}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-base">
                    {r.take_out_at}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-base">
                    {r.give_back_at ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-base">
                    {r.taken_by ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-base">
                    {r.returned_by ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
