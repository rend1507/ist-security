"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { IconPencil } from "@/components/Icons";
import { KeyTransactionPanel } from "@/components/KeyTransactionPanel";
import { LiveDuration } from "@/components/LiveDuration";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionAccessSummary } from "@/components/SessionAccessSummary";
import { openSettingsModal } from "@/lib/open-settings";
import { UI_MSG, uiAlert, uiApiAlert } from "@/lib/public-error";
import { toolbarGroup } from "@/lib/ui";

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
    take_out?: string | null;
    give_back?: string | null;
    durasi_ms: number;
    status: string;
  }[];
  notBack: {
    code: string;
    jenis: string;
    peminjam: string;
    take_out: string | null;
    give_back?: string | null;
    durasi_ms: number;
    status: string;
  }[];
  /** Ranking top* hanya bulan kalender WIB ini */
  monthLabel?: string;
  monthFrom?: string;
  monthTo?: string;
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
            <div className="mb-1 flex justify-between gap-2 text-base font-semibold">
              <span className={b.text}>{b.label}</span>
              <span className="shrink-0 font-mono tabular-nums">
                {b.value}
                {total > 0 ? (
                  <span className="ml-2 font-normal text-slate-700">
                    ({shareLabel(b.value, total)})
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-9 overflow-hidden rounded-md bg-slate-200">
              <div
                className={`flex h-full min-w-0 items-center ${b.color}`}
                style={barWidthStyle(b.value, total)}
              >
                {b.value > 0 && (
                  <span className="truncate px-2 text-base font-bold text-white">
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
              ? "mt-3 text-base font-semibold text-slate-700"
              : "mt-3 text-base font-bold text-rose-800"
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
  canEditOverdue = false,
  canTransact = false,
}: {
  initial: Stats | null;
  isSuperadmin?: boolean;
  /** Admin / Super Admin — edit batas dari badge pensil */
  canEditOverdue?: boolean;
  /** Buka popup kembalikan dari daftar Belum dikembalikan */
  canTransact?: boolean;
}) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [openGiveCode, setOpenGiveCode] = useState<string | null>(null);

  useEffect(() => {
    setStats(initial);
  }, [initial]);

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
        uiApiAlert(setError, UI_MSG.load, res, json);
        return;
      }
      setStats(json.data);
      setError(null);
    } catch (err) {
      uiAlert(setError, UI_MSG.network, err);
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
    <div className="space-y-5 sm:space-y-6">
      <div className={toolbarGroup}>
        {stats && stats.overdue > 0 && (
          <span className="rounded-md bg-rose-200 px-3 py-2 text-base font-bold text-rose-950">
            {stats.overdue} terlambat
          </span>
        )}
        {stats && (
          <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-800">
            Batas terlambat:{" "}
            <span className="font-mono">{stats.defaultOverdueMinutes}</span> mnt
            {canEditOverdue ? (
              <button
                type="button"
                onClick={() => openSettingsModal()}
                aria-label="Ubah batas terlambat"
                title="Ubah batas terlambat"
                className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-slate-400 bg-slate-50 text-slate-800 hover:bg-slate-100"
              >
                <IconPencil className="h-5 w-5" />
              </button>
            ) : null}
          </span>
        )}
        <OfflineSyncBadge />
      </div>

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}

      {isSuperadmin && <SessionAccessSummary />}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-lg border-2 border-slate-300 bg-white px-3 py-3.5 sm:px-4 sm:py-5">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Total kunci
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {stats?.total ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-3 py-3.5 text-emerald-950 sm:px-4 sm:py-5">
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">
            Siap dipinjam
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {stats ? siap : "—"}
          </p>
          <p className="mt-1 font-mono text-base font-semibold">
            {stats ? shareLabel(siap, stats.total) : "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-3 py-3.5 text-amber-950 sm:px-4 sm:py-5">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-950">
            Masih dibawa
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {stats?.outOnly ?? "—"}
          </p>
          <p className="mt-1 font-mono text-base font-semibold">
            {stats ? shareLabel(stats.outOnly, stats.total) : "—"}
          </p>
        </div>
        <div className="rounded-lg border-2 border-rose-500 bg-rose-50 px-3 py-3.5 text-rose-950 sm:px-4 sm:py-5">
          <p className="text-sm font-bold uppercase tracking-wide text-rose-950">
            Terlambat
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {stats?.overdue ?? "—"}
          </p>
          <p className="mt-1 font-mono text-base font-semibold">
            {stats ? shareLabel(stats.overdue, stats.total) : "—"}
          </p>
        </div>
      </div>

      {stats && <BarChart stats={stats} showDebug={isSuperadmin} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border-2 border-slate-300 bg-white p-3 sm:p-4">
          <h2 className="text-base font-bold text-slate-900">
            3 peminjam terbanyak
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Bulan {stats?.monthLabel ?? "berjalan"} (WIB)
          </p>
          {!stats?.topBorrowers.length ? (
            <p className="mt-3 text-base text-slate-500">
              Belum ada pinjam di bulan ini.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.topBorrowers.map((b, i) => (
                <li
                  key={b.name}
                  className="flex justify-between gap-2 border-b border-slate-200 py-2"
                >
                  <span className="min-w-0">
                    <span className="mr-2 font-mono text-slate-500">
                      {i + 1}.
                    </span>
                    {b.name}
                  </span>
                  <span className="shrink-0 font-mono font-semibold">
                    {b.count}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border-2 border-slate-300 bg-white p-3 sm:p-4">
          <h2 className="text-base font-bold text-slate-900">
            3 pinjaman paling lama
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Bulan {stats?.monthLabel ?? "berjalan"} (WIB)
          </p>
          {!stats?.topLongest.length ? (
            <p className="mt-3 text-base text-slate-500">
              Belum ada pinjam di bulan ini.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.topLongest.map((r) => (
                <li
                  key={`${r.code}-${r.take_out ?? ""}`}
                  className="flex justify-between gap-2 border-b border-slate-200 py-2"
                >
                  <span className="min-w-0">
                    <span className="font-mono font-bold">{r.code}</span>{" "}
                    <span className="text-slate-600">{r.jenis}</span>
                    {r.peminjam && r.peminjam !== "—" ? (
                      <span className="mt-0.5 block text-base text-slate-700">
                        {r.peminjam}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 self-center font-mono text-base font-bold tabular-nums">
                    <LiveDuration
                      takeOut={r.take_out ?? null}
                      giveBack={r.give_back ?? null}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border-2 border-slate-300 bg-white p-3 sm:p-4 lg:col-span-1">
          <h2 className="text-base font-bold text-slate-900">
            Belum dikembalikan
          </h2>
          <p className="mt-1 text-base text-slate-600">
            Durasi update tiap detik
            {canTransact
              ? " · ketuk kunci untuk catat kembali"
              : null}
          </p>
          {!stats?.notBack.length ? (
            <p className="mt-3 text-base text-slate-500">
              Semua kunci sudah kembali.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-base">
              {stats.notBack.map((r) => {
                const rowClass =
                  r.status === "overdue" ? "bg-rose-100" : "bg-amber-100";
                const durClass =
                  r.status === "overdue"
                    ? "shrink-0 font-mono text-lg font-bold tabular-nums text-rose-900"
                    : "shrink-0 font-mono text-lg font-bold tabular-nums text-amber-950";
                const body = (
                  <>
                    <span className="min-w-0 text-left">
                      <span className="font-mono text-lg font-bold">
                        {r.code}
                      </span>
                      <span className="mt-0.5 block text-base text-slate-700">
                        {r.jenis}
                      </span>
                      <span className="mt-0.5 block text-base font-semibold text-slate-800">
                        {r.peminjam}
                      </span>
                    </span>
                    <span className={durClass}>
                      <LiveDuration takeOut={r.take_out} giveBack={null} />
                    </span>
                  </>
                );
                return (
                  <li key={r.code}>
                    {canTransact ? (
                      <button
                        type="button"
                        onClick={() => setOpenGiveCode(r.code)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border-2 border-transparent px-2.5 py-2.5 text-left hover:border-slate-400 ${rowClass}`}
                      >
                        {body}
                      </button>
                    ) : (
                      <div
                        className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2.5 ${rowClass}`}
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {canTransact ? (
        <KeyTransactionPanel
          showToolbar={false}
          openGiveCode={openGiveCode}
          onOpenGiveHandled={() => setOpenGiveCode(null)}
        />
      ) : null}
    </div>
  );
}
