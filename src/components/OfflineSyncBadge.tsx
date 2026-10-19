"use client";

import { useEffect, useState } from "react";
import { flushSyncQueue, readSyncQueue } from "@/lib/offline-store";

export function OfflineSyncBadge() {
  const [pending, setPending] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setPending(readSyncQueue().length);
    tick();
    const id = window.setInterval(tick, 4000);
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
    <div className="flex items-center gap-2 text-xs">
      {pending > 0 && (
        <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
          Belum terkirim: {pending}
        </span>
      )}
      {pending > 0 && (
        <button
          type="button"
          onClick={onFlush}
          className="text-blue-600 hover:underline"
        >
          Kirim sekarang
        </button>
      )}
      {msg && <span className="text-slate-500">{msg}</span>}
    </div>
  );
}
