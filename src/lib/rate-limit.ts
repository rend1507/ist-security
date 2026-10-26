import { getDb } from "@/lib/db";
import {
  LOGIN_LOCK_SEC,
  LOGIN_MAX_FAILS,
  LOGIN_WINDOW_SEC,
} from "@/lib/security";

let tableReady = false;

async function ensureRateLimitTable(db: D1Database) {
  if (tableReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS login_rate_limit (
         bucket_key TEXT PRIMARY KEY,
         fail_count INTEGER NOT NULL DEFAULT 0,
         window_started_at TEXT NOT NULL,
         locked_until TEXT
       )`
    )
    .run();
  tableReady = true;
}

function nowIso() {
  return new Date().toISOString();
}

function plusSec(sec: number) {
  return new Date(Date.now() + sec * 1000).toISOString();
}

export async function assertLoginAllowed(
  bucketKey: string
): Promise<{ ok: true } | { ok: false; error: string; retryAfterSec?: number }> {
  const db = await getDb();
  await ensureRateLimitTable(db);
  const row = await db
    .prepare(
      `SELECT fail_count, window_started_at, locked_until
       FROM login_rate_limit WHERE bucket_key = ?`
    )
    .bind(bucketKey)
    .first<{
      fail_count: number;
      window_started_at: string;
      locked_until: string | null;
    }>();

  if (!row) return { ok: true };

  const now = Date.now();
  if (row.locked_until) {
    const until = Date.parse(row.locked_until);
    if (!Number.isNaN(until) && until > now) {
      const retryAfterSec = Math.ceil((until - now) / 1000);
      console.error(
        "[IST rate-limit] locked",
        bucketKey,
        `retryAfterSec=${retryAfterSec}`
      );
      return {
        ok: false,
        error: "Terlalu banyak percobaan. Coba lagi nanti.",
        retryAfterSec,
      };
    }
  }

  const started = Date.parse(row.window_started_at);
  if (
    !Number.isNaN(started) &&
    now - started > LOGIN_WINDOW_SEC * 1000 &&
    (!row.locked_until || Date.parse(row.locked_until) <= now)
  ) {
    await db
      .prepare(`DELETE FROM login_rate_limit WHERE bucket_key = ?`)
      .bind(bucketKey)
      .run();
  }

  return { ok: true };
}

export async function recordLoginFailure(bucketKey: string): Promise<void> {
  const db = await getDb();
  await ensureRateLimitTable(db);
  const row = await db
    .prepare(
      `SELECT fail_count, window_started_at, locked_until
       FROM login_rate_limit WHERE bucket_key = ?`
    )
    .bind(bucketKey)
    .first<{
      fail_count: number;
      window_started_at: string;
      locked_until: string | null;
    }>();

  const now = Date.now();
  if (!row) {
    await db
      .prepare(
        `INSERT INTO login_rate_limit (bucket_key, fail_count, window_started_at, locked_until)
         VALUES (?, 1, ?, NULL)`
      )
      .bind(bucketKey, nowIso())
      .run();
    return;
  }

  const started = Date.parse(row.window_started_at);
  const windowExpired =
    Number.isNaN(started) || now - started > LOGIN_WINDOW_SEC * 1000;

  let failCount = windowExpired ? 1 : Number(row.fail_count) + 1;
  const windowStarted = windowExpired ? nowIso() : row.window_started_at;
  let lockedUntil: string | null = null;

  if (failCount >= LOGIN_MAX_FAILS) {
    lockedUntil = plusSec(LOGIN_LOCK_SEC);
    failCount = LOGIN_MAX_FAILS;
  }

  await db
    .prepare(
      `UPDATE login_rate_limit
       SET fail_count = ?, window_started_at = ?, locked_until = ?
       WHERE bucket_key = ?`
    )
    .bind(failCount, windowStarted, lockedUntil, bucketKey)
    .run();
}

export async function clearLoginFailures(bucketKey: string): Promise<void> {
  const db = await getDb();
  await ensureRateLimitTable(db);
  await db
    .prepare(`DELETE FROM login_rate_limit WHERE bucket_key = ?`)
    .bind(bucketKey)
    .run();
}

/** Bucket dari IP + username (kurangi spray antar akun). */
export function loginBucket(ip: string, username: string): string {
  const u = username.trim().toLowerCase() || "-";
  const i = ip.trim() || "unknown";
  return `${i}|${u}`;
}

export function clientIpFromRequest(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return "unknown";
}
