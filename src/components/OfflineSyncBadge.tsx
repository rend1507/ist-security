"use client";

import { useEffect, useState } from "react";
import { flushSyncQueue, readSyncQueue } from "@/lib/offline-store";

export function OfflineSyncBadge() {
  const [pending, setPending] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setPending(readSyncQueue().length);
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  async function onFlush() {
    setMsg("Sync…");
    const res = await flushSyncQueue();
    setPending(readSyncQueue().length);
    setMsg(res.ok ? `Synced ${res.applied}` : res.error ?? "Gagal");
  }

  if (pending === 0 && !msg) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-base">
      {pending > 0 && (
        <span className="rounded-md border-2 border-amber-400 bg-amber-100 px-2.5 py-1.5 font-semibold text-amber-950">
          Belum terkirim: {pending}
        </span>
      )}
      {pending > 0 && (
        <button
          type="button"
          onClick={onFlush}
          className="font-semibold text-blue-800 underline"
        >
          Kirim sekarang
        </button>
      )}
      {msg && <span className="font-semibold text-slate-700">{msg}</span>}
    </div>
  );
}
