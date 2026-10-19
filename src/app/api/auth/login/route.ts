import { getDb, getEnv, jsonErr, jsonOk } from "@/lib/db";
import { setSessionCookie, signSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { ROLE_LABELS, canLogin, type Role } from "@/lib/roles";

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
      return jsonErr("ID atau password salah.", 401);
    }
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return jsonErr("ID atau password salah.", 401);

    const env = await getEnv();
    const secret = env.SESSION_SECRET || "ist-security-dev-secret-change-me";
    const token = await signSession(row.id, row.role, secret);
    await setSessionCookie(token);

    return jsonOk({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      role_label: ROLE_LABELS[row.role as Role] || row.role,
      email: row.email,
    });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal masuk", 500);
  }
}
