import { getSessionUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { canChangeAnyPin } from "@/lib/roles";

export const dynamic = "force-dynamic";

const MIN_LEN = 6;

/**
 * Ganti password login. Sendiri (wajib password lama),
 * atau Super Admin untuk siapa pun termasuk dirinya (tanpa password lama).
 */
export async function POST(req: Request) {
  try {
    const actor = await getSessionUser();
    if (!actor) return jsonErr("Silakan masuk dulu.", 401);

    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
      targetUsername?: string;
    };
    const newPassword = body.newPassword ?? "";
    if (newPassword.trim().length < MIN_LEN) {
      return jsonErr("Password baru minimal 6 karakter.", 400);
    }

    const db = await getDb();
    let targetId = actor.id;
    const targetName = body.targetUsername?.trim().toLowerCase() ?? "";

    if (targetName) {
      if (!canChangeAnyPin(actor.role)) {
        return jsonErr(
          "Hanya Super Admin yang bisa ganti password orang lain.",
          403
        );
      }
      const target = await db
        .prepare(
          `SELECT id FROM users
           WHERE lower(username) = ? AND deleted_at IS NULL`
        )
        .bind(targetName)
        .first<{ id: number }>();
      if (!target) return jsonErr("Petugas tidak ditemukan.", 404);
      targetId = target.id;
    } else {
      const current = body.currentPassword ?? "";
      if (!current) return jsonErr("Isi password lama.", 400);
      const self = await db
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .bind(actor.id)
        .first<{ password_hash: string | null }>();
      if (!self || !(await verifyPassword(current, self.password_hash))) {
        return jsonErr("Password lama salah.", 401);
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await db
      .prepare(
        `UPDATE users SET password_hash = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(passwordHash, targetId)
      .run();

    return jsonOk({ message: "Password berhasil diubah." });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal ganti password", 500);
  }
}
