import { requireUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { DEFAULT_OVERDUE_MINUTES } from "@/lib/domain";
import { canSetOverdue } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const db = await getDb();
  const row = await db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind("default_overdue_minutes")
    .first<{ value: string }>();
  const n = row ? Number(row.value) : DEFAULT_OVERDUE_MINUTES;
  return jsonOk({
    default_overdue_minutes:
      Number.isFinite(n) && n > 0 ? n : DEFAULT_OVERDUE_MINUTES,
  });
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canSetOverdue(user.role)) {
    return jsonErr("Akun ini tidak boleh mengatur batas terlambat.", 403);
  }

  try {
    const body = (await req.json()) as { default_overdue_minutes?: number };
    const n = Number(body.default_overdue_minutes);
    if (!Number.isFinite(n) || n <= 0) {
      return jsonErr("Isi batas terlambat dalam menit (angka positif).", 400);
    }

    const db = await getDb();
    await db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind("default_overdue_minutes", String(Math.floor(n)))
      .run();

    return jsonOk({ default_overdue_minutes: Math.floor(n) });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal menyimpan", 500);
  }
}
