"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { formatDuration } from "@/lib/domain";

type Stats = {
  total: number;
  available: number;
  returned: number;
  returnedOnly: number;
  onRack?: number;
  stillOut: number;
  outOnly: number;
  overdue: number;
  returnedPct: number;
  stillOutPct: number;
  chartSum?: number;
  topBorrowers: { name: string; count: number }[];
  topLongest: {
    code: string;
    jenis: string;
    peminjam: string;
    durasi_ms: number;
    status: string;
  }[];
  notBack: {
    code: string;
    jenis: string;
    peminjam: string;
    take_out: string | null;
    durasi_ms: number;
    status: string;
  }[];
  defaultOverdueMinutes: number;
  updatedAt: string;
};

/** Persen di UI — bulat (untuk dibaca petugas). */
function shareLabel(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part * 100) / total)}%`;
}

/** Lebar bar — proporsi eksak terhadap total, tanpa pembulatan. */
function barWidthStyle(part: number, total: number): CSSProperties {
  if (total <= 0 || part <= 0) return { width: "0%" };
  return { width: `calc(${part} / ${total} * 100%)` };
}

function BarChart({
  stats,
  showDebug,
}: {
  stats: Stats;
  showDebug?: boolean;
}) {
  const total = stats.total;
  const siapDipinjam = Math.max(0, total - stats.outOnly - stats.overdue);
  const bars = [
    {
      label: "Siap dipinjam",
      value: siapDipinjam,
      color: "bg-emerald-600",
      text: "text-emerald-900",
    },
    {
      label: "Masih dibawa",
      value: stats.outOnly,
      color: "bg-amber-500",
      text: "text-amber-950",
    },
    {
      label: "Terlambat",
      value: stats.overdue,
      color: "bg-rose-600",
      text: "text-rose-950",
    },
  ];
  const sum = bars.reduce((a, b) => a + b.value, 0);
  const ok = sum === total;

  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">Status kunci</h2>
      <ul className="mt-4 space-y-3">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="mb-1 flex justify-between gap-2 text-sm font-semibold">
              <span className={b.text}>{b.label}</span>
              <span className="shrink-0 font-mono tabular-nums">
                {b.value}
                {total > 0 ? (
                  <span className="ml-2 font-normal text-slate-600">
                    ({shareLabel(b.value, total)})
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-8 overflow-hidden rounded-md bg-slate-200">
              <div
                className={`flex h-full min-w-0 items-center ${b.color}`}
                style={barWidthStyle(b.value, total)}
              >
                {b.value > 0 && (
                  <span className="truncate px-2 text-sm font-bold text-white">
                    {b.value}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {showDebug && (
        <p
          className={
            ok
              ? "mt-3 text-sm font-semibold text-slate-700"
              : "mt-3 text-sm font-bold text-rose-800"
          }
        >
          Cek jumlah: {sum} / {total}
          {ok ? " ✓" : " — tidak cocok"}
        </p>
      )}
    </div>
  );
}

const POLL_MS = 60_000;

export function DashboardPanel({
  initial,
  isSuperadmin = false,
}: {
  initial: Stats | null;
  isSuperadmin?: boolean;
}) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: Stats;
        error?: string;
      };
      if (!json.ok || !json.data) {
        setError(json.error || "Gagal memuat ringkasan");
        return;
      }
      setStats(json.data);
      setError(null);
    } catch {
      setError("Tidak bisa terhubung.");
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void load(), POLL_MS);
    const onVis = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const siap = stats
    ? Math.max(0, stats.total - stats.outOnly - stats.overdue)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {stats && stats.overdue > 0 && (
            <span className="rounded bg-rose-200 px-2 py-1 text-sm font-bold text-rose-900">
              {stats.overdue} terlambat
            </span>
          )}
          <OfflineSyncBadge />
        </div>
      </div>

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-lg border-2 border-slate-300 bg-white px-3 py-4 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600 sm:text-sm">
            Total kunci
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats?.total ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-emerald-400 bg-emerald-50 px-3 py-4 text-emerald-950 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 sm:text-sm">
            Siap dipinjam
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats ? siap : "—"}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {stats ? shareLabel(siap, stats.total) : "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-4 text-amber-950 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900 sm:text-sm">
            Masih dibawa
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats?.outOnly ?? "—"}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {stats ? shareLabel(stats.outOnly, stats.total) : "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-rose-400 bg-rose-50 px-3 py-4 text-rose-950 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-900 sm:text-sm">
            Terlambat
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats?.overdue ?? "—"}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {stats ? shareLabel(stats.overdue, stats.total) : "—"}
          </p>
        </div>
      </div>

      {stats && <BarChart stats={stats} showDebug={isSuperadmin} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border-2 border-slate-300 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">
            3 peminjam terbanyak
          </h2>
          {!stats?.topBorrowers.length ? (
            <p className="mt-3 text-base text-slate-500">Belum ada data.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.topBorrowers.map((b, i) => (
                <li
                  key={b.name}
                  className="flex justify-between border-b border-slate-200 py-1.5"
                >
                  <span>
                    <span className="mr-2 font-mono text-slate-500">
                      {i + 1}.
                    </span>
                    {b.name}
                  </span>
                  <span className="font-mono font-semibold">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border-2 border-slate-300 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">
            3 pinjaman paling lama
          </h2>
          {!stats?.topLongest.length ? (
            <p className="mt-3 text-base text-slate-500">Belum ada data.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.topLongest.map((r) => (
                <li
                  key={r.code}
                  className="flex justify-between gap-2 border-b border-slate-200 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="font-mono font-bold">{r.code}</span>{" "}
                    <span className="text-slate-600">{r.jenis}</span>
                  </span>
                  <span className="shrink-0 font-mono font-semibold">
                    {formatDuration(r.durasi_ms)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border-2 border-slate-300 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">
            Belum dikembalikan
          </h2>
          {!stats?.notBack.length ? (
            <p className="mt-3 text-base text-slate-500">
              Semua kunci sudah kembali.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.notBack.map((r) => (
                <li
                  key={r.code}
                  className={`flex justify-between gap-2 rounded-md border-b border-slate-200 px-2 py-1.5 ${
                    r.status === "overdue" ? "bg-rose-100" : "bg-amber-100"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="font-mono font-bold">{r.code}</span>{" "}
                    <span className="text-slate-700">{r.jenis}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">
                      {r.peminjam}
                    </span>
                  </span>
                  <span
                    className={
                      r.status === "overdue"
                        ? "shrink-0 font-mono font-bold text-rose-900"
                        : "shrink-0 font-mono font-bold text-amber-950"
                    }
                  >
                    {formatDuration(r.durasi_ms)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
