import { getDb } from "@/lib/db";
import { nowLocalSql } from "@/lib/dates";

export const ACTIVITY_EVENTS = [
  "login",
  "logout",
  "key_create",
  "key_update",
  "key_delete",
  "password_change",
  "pin_change",
  "user_create",
  "user_deactivate",
  "jam_edit",
] as const;

export type SessionAccessEvent = (typeof ACTIVITY_EVENTS)[number];

export const ACTIVITY_EVENT_LABELS: Record<SessionAccessEvent, string> = {
  login: "Masuk",
  logout: "Keluar",
  key_create: "Tambah kunci",
  key_update: "Ubah kunci",
  key_delete: "Nonaktif kunci",
  password_change: "Ganti password",
  pin_change: "Ganti PIN",
  user_create: "Tambah akun",
  user_deactivate: "Nonaktif akun",
  jam_edit: "Ubah jam",
};

export type SessionAccessLogRow = {
  id: number;
  user_id: number;
  username: string;
  name: string | null;
  role: string;
  event: string;
  detail: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export const SESSION_LOG_PAGE_SIZES = [20, 50, 100] as const;
export type SessionLogPageSize = (typeof SESSION_LOG_PAGE_SIZES)[number];

export async function recordSessionAccess(input: {
  userId: number;
  username: string;
  name: string | null;
  role: string;
  event: SessionAccessEvent | string;
  detail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO session_access_logs
         (user_id, username, name, role, event, detail, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.userId,
      input.username,
      input.name,
      input.role,
      input.event,
      input.detail?.slice(0, 240) ?? null,
      input.ip ?? null,
      input.userAgent ? input.userAgent.slice(0, 400) : null,
      nowLocalSql()
    )
    .run();
}

export async function listSessionAccessLogs(opts: {
  fromYmd: string;
  toYmd: string;
  page: number;
  pageSize: SessionLogPageSize;
}): Promise<{ rows: SessionAccessLogRow[]; total: number }> {
  const db = await getDb();
  const fromTs = `${opts.fromYmd} 00:00:00`;
  const toTs = `${opts.toYmd} 23:59:59`;
  const page = Math.max(1, opts.page);
  const pageSize = opts.pageSize;
  const offset = (page - 1) * pageSize;

  const totalRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM session_access_logs
       WHERE created_at >= ? AND created_at <= ?`
    )
    .bind(fromTs, toTs)
    .first<{ n: number }>();

  const total = Number(totalRow?.n ?? 0);

  const { results } = await db
    .prepare(
      `SELECT id, user_id, username, name, role, event, detail, ip, user_agent, created_at
       FROM session_access_logs
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .bind(fromTs, toTs, pageSize, offset)
    .all<SessionAccessLogRow>();

  return { rows: results ?? [], total };
}

export async function summarizeSessionAccessLogs(
  fromYmd: string,
  toYmd: string
): Promise<{ login: number; logout: number; actions: number; total: number }> {
  const db = await getDb();
  const fromTs = `${fromYmd} 00:00:00`;
  const toTs = `${toYmd} 23:59:59`;
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN event = 'login' THEN 1 ELSE 0 END) AS login_n,
         SUM(CASE WHEN event = 'logout' THEN 1 ELSE 0 END) AS logout_n,
         SUM(CASE WHEN event NOT IN ('login', 'logout') THEN 1 ELSE 0 END) AS action_n,
         COUNT(*) AS total_n
       FROM session_access_logs
       WHERE created_at >= ? AND created_at <= ?`
    )
    .bind(fromTs, toTs)
    .first<{
      login_n: number | null;
      logout_n: number | null;
      action_n: number | null;
      total_n: number;
    }>();

  return {
    login: Number(row?.login_n ?? 0),
    logout: Number(row?.logout_n ?? 0),
    actions: Number(row?.action_n ?? 0),
    total: Number(row?.total_n ?? 0),
  };
}
