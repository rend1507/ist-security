"use client";

import { useSharedNow } from "@/lib/use-shared-now";

function formatWib(ts: number) {
  const d = new Date(ts);
  const hari = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
  });
  const tanggal = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return { hari, tanggal, jam };
}

/** Update tiap detik — jam header realtime. */
export function HeaderClock() {
  const now = useSharedNow(1_000, true);
  const { hari, tanggal, jam } = formatWib(now);

  return (
    <div
      className="min-w-0 text-left leading-tight sm:text-right"
      title="Waktu Asia/Jakarta"
    >
      <p className="text-sm font-semibold capitalize text-slate-800">
        {hari}
      </p>
      <p className="text-sm text-slate-700">{tanggal}</p>
      <p className="font-mono text-base font-bold tabular-nums text-slate-900">
        {jam}
      </p>
    </div>
  );
}
