"use client";

import { useCallback, useEffect, useState } from "react";
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

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function BarChart({ stats }: { stats: Stats }) {
  /** Siap dipinjam = total − masih dibawa − terlambat (gabungan siap + sudah kembali) */
  const siapDipinjam = Math.max(
    0,
    stats.total - stats.outOnly - stats.overdue
  );
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
  const max = Math.max(1, ...bars.map((b) => b.value));
  const ok = sum === stats.total;

  return (
    <div className="rounded-lg border-2 border-slate-300 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">
        Status kunci (bar chart)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Siap dipinjam = total − masih dibawa − terlambat. Terlambat tidak masuk
        masih dibawa.
      </p>
      <ul className="mt-4 space-y-3">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="mb-1 flex justify-between text-sm font-semibold">
              <span className={b.text}>{b.label}</span>
              <span className="font-mono tabular-nums">{b.value}</span>
            </div>
            <div className="h-8 overflow-hidden rounded-md bg-slate-200">
              <div
                className={`flex h-full items-center ${b.color} transition-all duration-500`}
                style={{
                  width: `${(b.value / max) * 100}%`,
                  minWidth: b.value ? "2rem" : 0,
                }}
              >
                {b.value > 0 && (
                  <span className="px-2 text-sm font-bold text-white">
                    {b.value}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p
        className={
          ok
            ? "mt-3 text-sm font-semibold text-slate-700"
            : "mt-3 text-sm font-bold text-rose-800"
        }
      >
        Jumlah bar: {sum} / total {stats.total}
        {ok ? " ✓" : " — tidak cocok, cek data"}
      </p>
    </div>
  );
}

export function DashboardPanel({ initial }: { initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
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
    const id = window.setInterval(() => {
      void load();
      setTick((t) => t + 1);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  /** Refresh durasi list tiap detik tanpa fetch ulang */
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const updatedLabel = stats?.updatedAt
    ? new Date(stats.updatedAt).toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "—";

  void tick;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-base text-slate-700">
          Gambaran kunci. Batas terlambat default:{" "}
          <span className="font-mono font-bold">
            {stats?.defaultOverdueMinutes ?? 5} menit
          </span>
          {stats && stats.overdue > 0 && (
            <span className="ml-2 rounded bg-rose-200 px-2 py-1 text-sm font-bold text-rose-900">
              {stats.overdue} terlambat
            </span>
          )}
          <span className="mt-1 block text-sm text-slate-500">
            Data diperbarui:{" "}
            <span className="font-mono font-semibold text-slate-800">
              {updatedLabel}
            </span>{" "}
            WIB · auto 15 detik
          </span>
        </p>
        <OfflineSyncBadge />
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
            {stats
              ? Math.max(0, stats.total - stats.outOnly - stats.overdue)
              : "—"}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {stats ? pct(stats.returnedPct) : "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-4 text-amber-950 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900 sm:text-sm">
            Masih dibawa
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats?.outOnly ?? "—"}
          </p>
          <p className="mt-1 text-xs text-amber-950/80">
            Belum lewat batas terlambat
          </p>
        </div>
        <div className="rounded-lg border-2 border-rose-400 bg-rose-50 px-3 py-4 text-rose-950 sm:px-4 sm:py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-900 sm:text-sm">
            Terlambat
          </p>
          <p className="mt-2 font-mono text-3xl font-bold sm:text-4xl">
            {stats?.overdue ?? "—"}
          </p>
        </div>
      </div>

      {stats && <BarChart stats={stats} />}

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
                    r.status === "overdue"
                      ? "bg-rose-100"
                      : "bg-amber-100"
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
