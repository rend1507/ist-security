"use client";

import { durationMs, formatDuration } from "@/lib/domain";
import { useSharedNow } from "@/lib/use-shared-now";

/** Durasi hidup; tick 1s agar realtime di mobile & dashboard. */
export function LiveDuration({
  takeOut,
  giveBack,
}: {
  takeOut: string | null;
  giveBack: string | null;
}) {
  const live = Boolean(takeOut && !giveBack);
  const now = useSharedNow(1_000, live);

  if (!takeOut) return <span>—</span>;
  const ms = durationMs(takeOut, giveBack, live ? now : Date.now());
  if (ms <= 0 && giveBack) return <span>—</span>;
  return <span className="tabular-nums">{formatDuration(ms)}</span>;
}
