"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { todayWibDate, wibDateDaysAgo } from "@/lib/dates";
import { btnPrimary, tableShell } from "@/lib/ui";

type Summary = { login: number; logout: number; total: number };

/** Ringkasan 7 hari di Dashboard — hanya Super Admin. */
export function SessionAccessSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [from, setFrom] = useState(() => wibDateDaysAgo(6));
  const [to, setTo] = useState(() => todayWibDate());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fromYmd = wibDateDaysAgo(6);
    const toYmd = todayWibDate();
    setFrom(fromYmd);
    setTo(toYmd);
    try {
      const q = new URLSearchParams({
        from: fromYmd,
        to: toYmd,
        summary: "1",
      });
      const res = await fetch(`/api/session-logs?${q}`, { cache: "no-store" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { summary: Summary };
        error?: string;
      };
      if (!json.ok || !json.data) {
        setError(json.error || "Gagal memuat ringkasan log akses");
        return;
      }
      setSummary(json.data.summary);
      setError(null);
    } catch {
      setError("Tidak bisa terhubung.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className={`${tableShell} space-y-3 p-3 sm:p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Log masuk / keluar
          </h2>
          <p className="mt-1 text-base text-slate-700">
            7 hari terakhir ({from} — {to}) · Super Admin
          </p>
        </div>
        <Link href="/log-akses" className={btnPrimary}>
          Lihat detail
        </Link>
      </div>

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-md border-2 border-emerald-400 bg-emerald-50 px-3 py-3">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">
            Masuk
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-emerald-950 sm:text-3xl">
            {summary?.login ?? "—"}
          </p>
        </div>
        <div className="rounded-md border-2 border-slate-300 bg-slate-50 px-3 py-3">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Keluar
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            {summary?.logout ?? "—"}
          </p>
        </div>
        <div className="rounded-md border-2 border-blue-300 bg-blue-50 px-3 py-3">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-900">
            Total
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-blue-950 sm:text-3xl">
            {summary?.total ?? "—"}
          </p>
        </div>
      </div>
    </section>
  );
}
