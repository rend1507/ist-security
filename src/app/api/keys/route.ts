import { requireUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { findKeyByScanOrCode } from "@/lib/key-lookup";
import { listKeyLogViews } from "@/lib/keys";
import { canManageMaster, canSetOverdue } from "@/lib/roles";
import { generateScanToken } from "@/lib/scan-token";
import { toStoredUpper } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode");
  try {
    if (mode === "resolve") {
      const q = url.searchParams.get("q")?.trim() ?? "";
      if (!q) return jsonErr("Kode scan kosong.", 400);
      const key = await findKeyByScanOrCode(q);
      if (!key) return jsonErr("Kunci tidak dikenali dari QR.", 404);
      return jsonOk({
        id: key.id,
        code: key.code,
        barcode: key.barcode,
        status: key.status,
      });
    }
    if (mode === "master") {
      if (!canManageMaster(user.role)) {
        return jsonErr("Akun ini tidak boleh mengelola daftar kunci.", 403);
      }
      const db = await getDb();
      const { results } = await db
        .prepare(
          `SELECT id, code, jenis, barcode, overdue_minutes, status, deleted_at
           FROM keys
           WHERE deleted_at IS NULL
           ORDER BY CAST(substr(code, 4) AS INTEGER) ASC, code ASC`
        )
        .all();
      return jsonOk(results ?? []);
    }
    const data = await listKeyLogViews();
    return jsonOk(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal baca kunci";
    return jsonErr(msg, 500);
  }
}

function normalizeCode(raw: string) {
  return toStoredUpper(raw.replace(/^\*/, "").replace(/\*$/, ""));
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageMaster(user.role)) {
    return jsonErr("Akun ini tidak boleh menambah kunci.", 403);
  }

  try {
    const body = (await req.json()) as {
      code?: string;
      jenis?: string;
      overdue_minutes?: number | null;
      regenerate_token?: boolean;
    };
    const code = normalizeCode(body.code ?? "");
    const jenis = toStoredUpper(body.jenis ?? "");
    if (!code) return jsonErr("Nama / kode kunci wajib diisi (huruf besar).", 400);
    if (!jenis) return jsonErr("Jenis kunci wajib diisi.", 400);

    const barcode = generateScanToken();

    const db = await getDb();
    const clash = await db
      .prepare(
        `SELECT id FROM keys
         WHERE deleted_at IS NULL AND (code = ? OR barcode = ?)
         LIMIT 1`
      )
      .bind(code, barcode)
      .first();
    if (clash) {
      return jsonErr("Nama kunci sudah dipakai. Pakai nama lain.", 400);
    }

    let overdue: number | null = null;
    if (
      canSetOverdue(user.role) &&
      body.overdue_minutes != null &&
      Number.isFinite(Number(body.overdue_minutes))
    ) {
      overdue = Number(body.overdue_minutes);
    }

    const res = await db
      .prepare(
        `INSERT INTO keys (code, jenis, barcode, overdue_minutes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'available', datetime('now'), datetime('now'))`
      )
      .bind(code, jenis, barcode, overdue)
      .run();

    return jsonOk({
      id: Number(res.meta.last_row_id),
      code,
      jenis,
      barcode,
    });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal menambah kunci", 500);
  }
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageMaster(user.role)) {
    return jsonErr("Akun ini tidak boleh mengubah data kunci.", 403);
  }

  try {
    const body = (await req.json()) as {
      id?: number;
      code?: string;
      jenis?: string;
      overdue_minutes?: number | null;
      deactivate?: boolean;
      regenerate_token?: boolean;
    };
    const id = Number(body.id);
    if (!id) return jsonErr("Data kunci tidak valid.", 400);

    const db = await getDb();
    const existing = await db
      .prepare(
        `SELECT id, code, status, jenis, barcode, overdue_minutes FROM keys
         WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(id)
      .first<{
        id: number;
        code: string;
        status: string;
        jenis: string;
        barcode: string;
        overdue_minutes: number | null;
      }>();
    if (!existing) return jsonErr("Kunci tidak ditemukan.", 404);

    if (body.deactivate) {
      if (existing.status === "out") {
        return jsonErr(
          "Kunci masih dibawa. Kembalikan dulu sebelum dinonaktifkan.",
          400
        );
      }
      await db
        .prepare(
          `UPDATE keys SET deleted_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(id)
        .run();
      return jsonOk({ id, deactivated: true });
    }

    const code =
      body.code != null ? normalizeCode(body.code) : existing.code;
    const jenis =
      body.jenis !== undefined
        ? toStoredUpper(body.jenis)
        : existing.jenis;
    const barcode = body.regenerate_token
      ? generateScanToken()
      : existing.barcode;

    if (body.code != null && !code) {
      return jsonErr("Nama / kode kunci wajib diisi.", 400);
    }
    if (body.jenis !== undefined && !jenis) {
      return jsonErr("Jenis kunci wajib diisi.", 400);
    }

    const clash = await db
      .prepare(
        `SELECT id FROM keys
         WHERE deleted_at IS NULL AND id != ? AND (code = ? OR barcode = ?)
         LIMIT 1`
      )
      .bind(id, code, barcode)
      .first();
    if (clash) {
      return jsonErr("Nama kunci atau token sudah dipakai kunci lain.", 400);
    }

    let nextOverdue = existing.overdue_minutes;
    if (body.overdue_minutes !== undefined) {
      if (!canSetOverdue(user.role)) {
        return jsonErr("Akun ini tidak boleh mengatur batas terlambat.", 403);
      }
      nextOverdue =
        body.overdue_minutes == null
          ? null
          : Number(body.overdue_minutes);
    }

    await db
      .prepare(
        `UPDATE keys
         SET code = ?, jenis = ?, barcode = ?, overdue_minutes = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(code, jenis, barcode, nextOverdue, id)
      .run();

    return jsonOk({ id, code, jenis, barcode });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal mengubah kunci", 500);
  }
}
