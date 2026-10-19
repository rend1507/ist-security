"use client";

import { useEffect, useState } from "react";
import { durationMs, formatDuration } from "@/lib/domain";

/** Durasi hidup (tick 1s) untuk kunci yang masih dibawa; selesai = statis. */
export function LiveDuration({
  takeOut,
  giveBack,
}: {
  takeOut: string | null;
  giveBack: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  const live = Boolean(takeOut && !giveBack);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  if (!takeOut) return <span>—</span>;
  const ms = durationMs(takeOut, giveBack, now);
  if (ms <= 0 && giveBack) return <span>—</span>;
  return <span className="tabular-nums">{formatDuration(ms)}</span>;
}
