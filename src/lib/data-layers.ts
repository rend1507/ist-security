/**
 * Strategi data IST Security (MVP):
 * A) Client mock/localStorage — hold, encryption_code cache, sync queue
 * B) Offline queue di perangkat → flush saat online
 * C) Cloudflare D1 (source of truth online) + Worker
 *
 * Sync offline→D1 WAJIB MVP: POST /api/sync
 */

export type DataLayer = "mock" | "offline_queue" | "d1";

export const DEFAULT_OVERDUE_MINUTES = 5;

export const PLANNED_ROLES = [
  "superadmin",
  "kepala_security",
  "admin",
  "security",
] as const;
