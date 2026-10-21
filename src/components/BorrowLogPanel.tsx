"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BorrowLogListRow } from "@/lib/borrow-logs";
import { todayWibDate } from "@/lib/dates";
import { btnPrimary } from "@/lib/ui";

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
        setError(json.error || "Gagal memuat log");
        setRows([]);
        return;
      }
      setRows(json.data.rows);
    } catch {
      setError("Tidak bisa terhubung.");
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
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-base font-semibold text-slate-800">
          Dari tanggal
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2 font-mono text-base"
          />
        </label>
        <label className="block text-base font-semibold text-slate-800">
          Sampai tanggal
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full min-w-[10rem] rounded-md border-2 border-slate-400 bg-white px-3 py-2 font-mono text-base"
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

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border-2 border-slate-300 bg-white">
        <table className="min-w-full text-left text-base">
          <thead className="bg-slate-200 text-sm font-bold uppercase text-slate-800">
            <tr>
              {COLUMNS.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th key={col.key} className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex min-h-10 cursor-pointer items-center gap-1 hover:text-slate-950"
                    >
                      {col.label}
                      <span className="text-[10px] opacity-80">
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
                  className="px-3 py-6 text-center text-slate-500"
                >
                  Tidak ada log di rentang tanggal ini.
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-mono font-bold">
                    {r.key_code}
                  </td>
                  <td className="px-3 py-2">{r.key_jenis}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{r.borrower_name}</span>
                    {r.borrower_divisi ? (
                      <span className="mt-0.5 block text-sm text-slate-600">
                        {r.borrower_divisi}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-sm">
                    {r.take_out_at}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-sm">
                    {r.give_back_at ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-sm">{r.taken_by ?? "—"}</td>
                  <td className="px-3 py-2 text-sm">
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
