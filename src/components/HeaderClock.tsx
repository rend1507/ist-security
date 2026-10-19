"use client";

import { useEffect, useState } from "react";

function formatWib(d: Date) {
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

export function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { hari, tanggal, jam } = formatWib(now);

  return (
    <div
      className="min-w-0 text-left leading-tight sm:text-right"
      aria-live="polite"
      title="Waktu Asia/Jakarta"
    >
      <p className="text-xs font-semibold capitalize text-slate-800 sm:text-sm">
        {hari}
      </p>
      <p className="text-xs text-slate-600 sm:text-sm">{tanggal}</p>
      <p className="font-mono text-sm font-bold tabular-nums text-slate-900 sm:text-base">
        {jam}
      </p>
    </div>
  );
}
