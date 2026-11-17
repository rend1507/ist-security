import { nowLocalSql } from "@/lib/dates";

export const BACKUP_PAGE_SIZES = [20, 50, 100] as const;
export type BackupPageSize = (typeof BACKUP_PAGE_SIZES)[number];

export const BACKUP_KINDS = ["backup", "restore_point", "restore"] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];

export const BACKUP_KIND_LABELS: Record<BackupKind, string> = {
  backup: "Cadangan",
  restore_point: "Titik pulih",
  restore: "Pulihkan",
};

/** Jam sepi lapangan: 21.00–03.00 WIB. Di luar itu restore wajib konfirmasi ekstra. */
export const RESTORE_QUIET_FROM_HOUR = 21;
export const RESTORE_QUIET_UNTIL_HOUR = 3;

export type TableDump = {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type BackupPayload = {
  version: 1;
  created_at: string;
  from_ts: string | null;
  to_ts: string | null;
  tables: TableDump[];
};

export type TableSummary = {
  table: string;
  rows: number;
};

export type BackupRecord = {
  id: number;
  kind: string;
  mode: string | null;
  filename: string;
  from_ts: string | null;
  to_ts: string | null;
  summary: TableSummary[];
  rows_stored: number;
  rows_removed: number;
  rows_updated: number;
  restore_point_id: number | null;
  created_by_user_id: number;
  created_by_username: string;
  created_at: string;
};

export function wibHour(sqlTs = nowLocalSql()): number {
  return Number(sqlTs.slice(11, 13));
}

export function isRestoreQuietHours(sqlTs = nowLocalSql()): boolean {
  const hour = wibHour(sqlTs);
  return hour >= RESTORE_QUIET_FROM_HOUR || hour < RESTORE_QUIET_UNTIL_HOUR;
}
