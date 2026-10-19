"use client";

import { useEffect, useState } from "react";

type Bucket = {
  now: number;
  listeners: Set<() => void>;
  timer: number | null;
};

const buckets = new Map<number, Bucket>();

function getBucket(intervalMs: number): Bucket {
  let b = buckets.get(intervalMs);
  if (!b) {
    b = { now: Date.now(), listeners: new Set(), timer: null };
    buckets.set(intervalMs, b);
  }
  return b;
}

/** Satu interval per periode — hemat resource vs tiap komponen punya setInterval sendiri. */
export function useSharedNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    const b = getBucket(intervalMs);
    const onTick = () => setNow(b.now);
    b.listeners.add(onTick);
    setNow(b.now);

    if (b.timer == null) {
      b.timer = window.setInterval(() => {
        b.now = Date.now();
        b.listeners.forEach((fn) => fn());
      }, intervalMs);
    }

    return () => {
      b.listeners.delete(onTick);
      if (b.listeners.size === 0 && b.timer != null) {
        window.clearInterval(b.timer);
        b.timer = null;
      }
    };
  }, [intervalMs, enabled]);

  return enabled ? now : Date.now();
}
