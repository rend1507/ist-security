import { logActivity } from "@/lib/activity-log";
import {
  getBackupPayload,
  isRestoreQuietHours,
  parseUploadedPayload,
  restorePayload,
} from "@/lib/backup";
import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { nowLocalSql } from "@/lib/dates";
import { canBackupRestore } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canBackupRestore(user.role)) {
    return jsonErr("Hanya Super Admin yang bisa memulihkan data.", 403);
  }

  try {
    const body = (await req.json()) as {
      backupId?: number;
      payload?: unknown;
      mode?: string;
      confirm?: boolean;
      confirmOffHours?: boolean;
    };
    if (!body.confirm) {
      return jsonErr("Centang konfirmasi sebelum memulihkan.", 400);
    }
    const mode = body.mode === "merge" ? "merge" : body.mode === "replace" ? "replace" : null;
    if (!mode) {
      return jsonErr("Pilih ganti semua atau ubah menurut ID.", 400);
    }

    const now = nowLocalSql();
    if (!isRestoreQuietHours(now) && !body.confirmOffHours) {
      return jsonErr(
        "Sekarang di luar jam sepi (21.00–03.00). Centang konfirmasi jam operasional, atau jalankan nanti malam.",
        409
      );
    }

    let payload = body.backupId
      ? await getBackupPayload(Number(body.backupId))
      : parseUploadedPayload(body.payload);
    if (!payload) {
      return jsonErr("Pilih cadangan dari Riwayat atau unggah file JSON.", 400);
    }

    const record = await restorePayload(user, payload, mode);
    await logActivity(
      user,
      "restore_run",
      `#${record.id} · ${mode} · simpan ${record.rows_stored} · ubah ${record.rows_updated} · hapus ${record.rows_removed}`,
      req
    );
    return jsonOk(record);
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal memulihkan data", 500);
  }
}
