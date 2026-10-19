export const ROLES = [
  "superadmin",
  "kepala_security",
  "admin",
  "security",
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_OVERDUE_MINUTES = 5;

/** Maksimum ubah jam take out / give back per catatan pinjam */
export const MAX_EDITS = 4;

export type UserRow = {
  id: number;
  username: string;
  name: string;
  pin_hash: string;
  role: Role | string;
  encryption_code: string | null;
};

export type KeyRow = {
  id: number;
  code: string;
  jenis: string;
  barcode: string;
  overdue_minutes: number | null;
  status: "available" | "out" | string;
};

export type BorrowLogRow = {
  id: number;
  key_id: number;
  borrower_name: string;
  borrower_divisi: string;
  take_out_at: string;
  give_back_at: string | null;
  taken_by_user_id: number | null;
  returned_by_user_id: number | null;
  client_uuid: string | null;
};

export type KeyLogView = {
  no: number;
  key_id: number;
  code: string;
  jenis: string;
  barcode: string;
  peminjam: string;
  divisi: string;
  take_out: string | null;
  give_back: string | null;
  durasi_ms: number;
  status: "returned" | "out" | "overdue" | "available";
  overdue_minutes: number;
  log_id: number | null;
  edit_count: number;
};

export function effectiveOverdueMinutes(
  keyOverdue: number | null | undefined,
  globalDefault = DEFAULT_OVERDUE_MINUTES
): number {
  if (keyOverdue != null && Number.isFinite(keyOverdue) && keyOverdue > 0) {
    return keyOverdue;
  }
  return globalDefault;
}

/** Parse waktu D1/Excel `YYYY-MM-DD HH:mm:ss` sebagai WIB (+07). */
export function parseAppDateTime(value: string): number {
  const raw = value.trim();
  if (!raw) return NaN;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const iso = raw.replace(" ", "T") + "+07:00";
    return Date.parse(iso);
  }
  return Date.parse(raw);
}

export function durationMs(takeOut: string, giveBack: string | null, now = Date.now()): number {
  const start = parseAppDateTime(takeOut);
  if (Number.isNaN(start)) return 0;
  const end = giveBack ? parseAppDateTime(giveBack) : now;
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

/** Format lama pinjam: `DD HH:MM:SS` — sembunyikan DD jika belum 1 hari. */
export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (days > 0) return `${String(days).padStart(2, "0")} ${hms}`;
  return hms;
}

export function classifyStatus(
  keyStatus: string,
  takeOut: string | null,
  giveBack: string | null,
  overdueMinutes: number,
  now = Date.now()
): KeyLogView["status"] {
  if (giveBack) return "returned";
  if (!takeOut || keyStatus === "available") return "available";
  const ms = durationMs(takeOut, null, now);
  if (ms >= overdueMinutes * 60_000) return "overdue";
  return "out";
}
