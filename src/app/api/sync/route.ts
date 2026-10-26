import { requireUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { UI_MSG, jsonPublicErr } from "@/lib/public-error";
import { canTransact } from "@/lib/roles";

export const dynamic = "force-dynamic";

type SyncItem = {
  id: string;
  entity: string;
  op?: string;
  payload: Record<string, unknown>;
  createdAt?: string;
};

/**
 * Offline → D1: terima antrian client, simpan ke sync_queue, terapkan borrow_log bila lengkap.
 * Wajib sesi login (cookie HttpOnly) — jangan terima sync anonim.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canTransact(user.role)) {
    return jsonErr("Akun ini tidak boleh sync transaksi.", 403);
  }

  try {
    const body = (await req.json()) as { clientId?: string; items?: SyncItem[] };
    const clientId = body.clientId?.trim() || `user-${user.id}`;
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return jsonOk({ appliedIds: [] as string[] });

    const db = await getDb();
    const appliedIds: string[] = [];

    for (const item of items) {
      if (!item?.id || !item.entity || !item.payload) continue;

      await db
        .prepare(
          `INSERT INTO sync_queue (client_id, entity, op, payload, status, created_at)
           VALUES (?, ?, ?, ?, 'pending', datetime('now'))`
        )
        .bind(
          clientId,
          item.entity,
          item.op ?? "upsert",
          JSON.stringify(item.payload)
        )
        .run();

      if (item.entity === "borrow_log") {
        const p = item.payload;
        const clientUuid = String(p.client_uuid ?? item.id);
        const keyCode = String(p.key_code ?? "");
        const borrower = String(p.borrower_name ?? "");
        const takeOut = String(p.take_out_at ?? "");
        if (!keyCode || !borrower || !takeOut) {
          await db
            .prepare(
              `UPDATE sync_queue SET status = 'error', error = ? WHERE id = last_insert_rowid()`
            )
            .bind("payload borrow_log tidak lengkap")
            .run();
          continue;
        }

        const key = await db
          .prepare("SELECT id FROM keys WHERE code = ? AND deleted_at IS NULL")
          .bind(keyCode)
          .first<{ id: number }>();
        if (!key) {
          await db
            .prepare(
              `UPDATE sync_queue SET status = 'error', error = ? WHERE id = last_insert_rowid()`
            )
            .bind(`kunci ${keyCode} tidak ada`)
            .run();
          continue;
        }

        const existing = await db
          .prepare("SELECT id FROM borrow_logs WHERE client_uuid = ?")
          .bind(clientUuid)
          .first<{ id: number }>();

        if (!existing) {
          await db
            .prepare(
              `INSERT INTO borrow_logs (
                key_id, borrower_name, borrower_divisi, take_out_at, give_back_at,
                client_uuid, synced_at, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`
            )
            .bind(
              key.id,
              borrower,
              String(p.borrower_divisi ?? ""),
              takeOut,
              p.give_back_at ? String(p.give_back_at) : null,
              clientUuid
            )
            .run();

          if (!p.give_back_at) {
            await db
              .prepare(
                `UPDATE keys SET status = 'out', updated_at = datetime('now') WHERE id = ?`
              )
              .bind(key.id)
              .run();
          }
        } else if (p.give_back_at) {
          await db
            .prepare(
              `UPDATE borrow_logs
               SET give_back_at = ?, synced_at = datetime('now'), updated_at = datetime('now')
               WHERE id = ?`
            )
            .bind(String(p.give_back_at), existing.id)
            .run();
          await db
            .prepare(
              `UPDATE keys SET status = 'available', updated_at = datetime('now') WHERE id = ?`
            )
            .bind(key.id)
            .run();
        }

        await db
          .prepare(
            `UPDATE sync_queue SET status = 'applied', applied_at = datetime('now')
             WHERE id = last_insert_rowid()`
          )
          .run();
      } else {
        await db
          .prepare(
            `UPDATE sync_queue SET status = 'applied', applied_at = datetime('now')
             WHERE id = last_insert_rowid()`
          )
          .run();
      }

      appliedIds.push(item.id);
    }

    return jsonOk({ appliedIds });
  } catch (e) {
    return jsonPublicErr(e, 500, UI_MSG.generic);
  }
}
