import { getDb } from "@/lib/db";
import { MAX_EDITS } from "@/lib/domain";
import { findKeyByScanOrCode } from "@/lib/key-lookup";
import { nowLocalSql, verifyPin } from "@/lib/pin";
import type { SessionUser } from "@/lib/auth";
import { toStoredUpper } from "@/lib/text";

export async function assertUserPin(
  userId: number,
  pin: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT pin_hash FROM users WHERE id = ? AND deleted_at IS NULL")
    .bind(userId)
    .first<{ pin_hash: string }>();
  if (!row) return { ok: false, error: "Akun tidak ditemukan." };
  const match = await verifyPin(pin, row.pin_hash);
  if (!match) return { ok: false, error: "PIN salah. Coba lagi." };
  return { ok: true };
}

export async function findOrCreateBorrower(
  name: string,
  divisi = ""
): Promise<{ id: number; name: string; divisi: string }> {
  const db = await getDb();
  const raw = name.trim();
  if (!raw) throw new Error("Nama peminjam wajib diisi.");

  const div = toStoredUpper(divisi);
  let display = toStoredUpper(raw.replace(/\s*\([^)]*\)\s*$/, "").trim() || raw);
  let fullName = toStoredUpper(raw);
  if (div && !raw.includes("(")) {
    fullName = `${display} (${div})`;
  } else {
    display = toStoredUpper(fullName.replace(/\s*\([^)]*\)\s*$/, "").trim() || fullName);
  }

  const existing = await db
    .prepare(
      `SELECT id, name, divisi FROM borrowers
       WHERE deleted_at IS NULL AND (name = ? OR display_name = ?)
       LIMIT 1`
    )
    .bind(fullName, display)
    .first<{ id: number; name: string; divisi: string }>();
  if (existing) return existing;

  const res = await db
    .prepare(
      `INSERT INTO borrowers (name, display_name, divisi, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(fullName, display, div)
    .run();

  return {
    id: Number(res.meta.last_row_id),
    name: fullName,
    divisi: div,
  };
}

export async function takeOutKey(opts: {
  user: SessionUser;
  pin: string;
  keyCode: string;
  borrowerName: string;
  borrowerDivisi?: string;
  clientUuid?: string;
}) {
  const pinOk = await assertUserPin(opts.user.id, opts.pin);
  if (!pinOk.ok) return { ok: false as const, error: pinOk.error };

  const db = await getDb();
  const key = await findKeyByScanOrCode(opts.keyCode);

  if (!key) return { ok: false as const, error: "Kunci tidak ditemukan." };
  if (key.status === "out") {
    return {
      ok: false as const,
      error: `Kunci ${key.code} masih dibawa. Kembalikan dulu sebelum dipinjam lagi.`,
    };
  }

  const borrower = await findOrCreateBorrower(
    opts.borrowerName,
    opts.borrowerDivisi ?? ""
  );
  const takeAt = nowLocalSql();
  const clientUuid = opts.clientUuid || crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO borrow_logs (
        key_id, borrower_name, borrower_divisi, take_out_at, give_back_at,
        taken_by_user_id, client_uuid, synced_at, edit_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, ?, datetime('now'), 0, datetime('now'), datetime('now'))`
    )
    .bind(
      key.id,
      borrower.name,
      borrower.divisi,
      takeAt,
      opts.user.id,
      clientUuid
    )
    .run();

  await db
    .prepare(
      `UPDATE keys SET status = 'out', updated_at = datetime('now') WHERE id = ?`
    )
    .bind(key.id)
    .run();

  return {
    ok: true as const,
    data: { keyCode: key.code, takeOutAt: takeAt, borrower: borrower.name },
  };
}

export async function giveBackKey(opts: {
  user: SessionUser;
  pin: string;
  keyCode: string;
}) {
  const pinOk = await assertUserPin(opts.user.id, opts.pin);
  if (!pinOk.ok) return { ok: false as const, error: pinOk.error };

  const db = await getDb();
  const key = await findKeyByScanOrCode(opts.keyCode);

  if (!key) return { ok: false as const, error: "Kunci tidak ditemukan." };

  const openLog = await db
    .prepare(
      `SELECT id FROM borrow_logs
       WHERE key_id = ? AND give_back_at IS NULL
       ORDER BY take_out_at DESC LIMIT 1`
    )
    .bind(key.id)
    .first<{ id: number }>();

  if (!openLog) {
    return {
      ok: false as const,
      error: `Kunci ${key.code} tidak sedang dipinjam.`,
    };
  }

  const giveAt = nowLocalSql();
  await db
    .prepare(
      `UPDATE borrow_logs
       SET give_back_at = ?, returned_by_user_id = ?, synced_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(giveAt, opts.user.id, openLog.id)
    .run();

  await db
    .prepare(
      `UPDATE keys SET status = 'available', updated_at = datetime('now') WHERE id = ?`
    )
    .bind(key.id)
    .run();

  return {
    ok: true as const,
    data: { keyCode: key.code, giveBackAt: giveAt },
  };
}

export async function editBorrowTimes(opts: {
  user: SessionUser;
  pin: string;
  logId: number;
  takeOutAt?: string;
  giveBackAt?: string | null;
}) {
  const pinOk = await assertUserPin(opts.user.id, opts.pin);
  if (!pinOk.ok) return { ok: false as const, error: pinOk.error };

  const db = await getDb();
  const log = await db
    .prepare(
      `SELECT id, take_out_at, give_back_at, edit_count FROM borrow_logs WHERE id = ?`
    )
    .bind(opts.logId)
    .first<{
      id: number;
      take_out_at: string;
      give_back_at: string | null;
      edit_count: number;
    }>();

  if (!log) return { ok: false as const, error: "Catatan pinjam tidak ditemukan." };
  if (log.edit_count >= MAX_EDITS) {
    return {
      ok: false as const,
      error: `Jam sudah diubah ${MAX_EDITS} kali. Tidak bisa diubah lagi. Hubungi Kepala Security.`,
    };
  }

  const edits: { field: string; old: string | null; next: string | null }[] = [];
  if (opts.takeOutAt != null && opts.takeOutAt !== log.take_out_at) {
    edits.push({
      field: "take_out_at",
      old: log.take_out_at,
      next: opts.takeOutAt,
    });
  }
  if (
    opts.giveBackAt !== undefined &&
    opts.giveBackAt !== log.give_back_at
  ) {
    edits.push({
      field: "give_back_at",
      old: log.give_back_at,
      next: opts.giveBackAt,
    });
  }
  if (edits.length === 0) {
    return { ok: false as const, error: "Tidak ada perubahan jam." };
  }

  for (const e of edits) {
    await db
      .prepare(
        `INSERT INTO borrow_edit_logs (
          borrow_log_id, edited_by_user_id, field_name, old_value, new_value, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(log.id, opts.user.id, e.field, e.old, e.next)
      .run();
  }

  const nextTake = opts.takeOutAt ?? log.take_out_at;
  const nextGive =
    opts.giveBackAt !== undefined ? opts.giveBackAt : log.give_back_at;

  await db
    .prepare(
      `UPDATE borrow_logs
       SET take_out_at = ?, give_back_at = ?, edit_count = edit_count + 1,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(nextTake, nextGive, log.id)
    .run();

  return {
    ok: true as const,
    data: {
      editCount: log.edit_count + 1,
      remaining: MAX_EDITS - (log.edit_count + 1),
    },
  };
}
