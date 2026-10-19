import { getSessionUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { hashPin, isValidPinFormat, verifyPin } from "@/lib/pin";
import { canChangeAnyPin } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Ganti PIN (6 angka). Self, atau Super Admin untuk orang lain.
 * Notifikasi email = disimulasikan (dicatat di pin_change_logs).
 */
export async function POST(req: Request) {
  try {
    const actor = await getSessionUser();
    if (!actor) return jsonErr("Silakan masuk dulu.", 401);

    const body = (await req.json()) as {
      currentPin?: string;
      newPin?: string;
      targetUsername?: string;
    };
    const newPin = body.newPin?.trim() ?? "";
    if (!isValidPinFormat(newPin)) {
      return jsonErr("PIN baru harus 6 angka.", 400);
    }

    const db = await getDb();
    let targetId = actor.id;
    let notifyEmail = actor.email;

    if (body.targetUsername && body.targetUsername !== actor.username) {
      if (!canChangeAnyPin(actor.role)) {
        return jsonErr("Hanya Super Admin yang bisa ganti PIN orang lain.", 403);
      }
      const target = await db
        .prepare(
          `SELECT id, email, pin_hash FROM users
           WHERE lower(username) = ? AND deleted_at IS NULL`
        )
        .bind(body.targetUsername.trim().toLowerCase())
        .first<{ id: number; email: string | null; pin_hash: string }>();
      if (!target) return jsonErr("Petugas tidak ditemukan.", 404);
      targetId = target.id;
      notifyEmail = target.email;
    } else {
      const current = body.currentPin?.trim() ?? "";
      if (!isValidPinFormat(current)) {
        return jsonErr("Isi PIN lama (6 angka).", 400);
      }
      const self = await db
        .prepare("SELECT pin_hash, email FROM users WHERE id = ?")
        .bind(actor.id)
        .first<{ pin_hash: string; email: string | null }>();
      if (!self || !(await verifyPin(current, self.pin_hash))) {
        return jsonErr("PIN lama salah.", 401);
      }
      notifyEmail = self.email;
    }

    const pinHash = await hashPin(newPin);
    await db
      .prepare(
        `UPDATE users SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(pinHash, targetId)
      .run();

    await db
      .prepare(
        `INSERT INTO pin_change_logs (
          user_id, changed_by_user_id, notify_email, email_status, created_at
        ) VALUES (?, ?, ?, 'simulated', datetime('now'))`
      )
      .bind(targetId, actor.id, notifyEmail)
      .run();

    return jsonOk({
      message:
        "PIN berhasil diubah. Pemberitahuan email dicatat (simulasi — belum kirim sungguhan).",
      notifyEmail,
      emailStatus: "simulated",
    });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal ganti PIN", 500);
  }
}
