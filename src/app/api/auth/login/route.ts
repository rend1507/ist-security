import { getDb, getEnv, jsonErr, jsonOk } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { ROLE_LABELS, canLogin, type Role } from "@/lib/roles";
import { resolveSessionSecret } from "@/lib/security";
import { UI_MSG, jsonPublicErr } from "@/lib/public-error";
import {
  assertLoginAllowed,
  clearLoginFailures,
  clientIpFromRequest,
  loginBucket,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { recordSessionAccess } from "@/lib/session-logs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
    };
    const username = body.username?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!username) return jsonErr("Isi ID petugas / username.", 400);
    if (!password) return jsonErr("Isi password.", 400);

    const bucket = loginBucket(clientIpFromRequest(req), username);
    const gate = await assertLoginAllowed(bucket);
    if (!gate.ok) {
      return jsonPublicErr(gate.error, 429, UI_MSG.loginLock);
    }

    const db = await getDb();
    const row = await db
      .prepare(
        `SELECT id, username, name, role, password_hash, email FROM users
         WHERE lower(username) = ? AND deleted_at IS NULL`
      )
      .bind(username)
      .first<{
        id: number;
        username: string;
        name: string;
        role: string;
        password_hash: string | null;
        email: string | null;
      }>();

    if (!row || !canLogin(row.role)) {
      await recordLoginFailure(bucket);
      return jsonErr(UI_MSG.loginFail, 401);
    }
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      await recordLoginFailure(bucket);
      return jsonErr(UI_MSG.loginFail, 401);
    }

    await clearLoginFailures(bucket);

    const env = await getEnv();
    const secret = resolveSessionSecret(env.SESSION_SECRET);
    const token = await signSession(row.id, row.role, secret);
    await setSessionCookie(token);

    try {
      await recordSessionAccess({
        userId: Number(row.id),
        username: row.username,
        name: row.name,
        role: row.role,
        event: "login",
        ip: clientIpFromRequest(req),
        userAgent: req.headers.get("user-agent"),
      });
    } catch {
      /* jangan gagalkan login jika log audit gagal */
    }

    return jsonOk({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      role_label: ROLE_LABELS[row.role as Role] || row.role,
      email: row.email,
    });
  } catch (e) {
    return jsonPublicErr(e, 503, UI_MSG.loginBusy);
  }
}
