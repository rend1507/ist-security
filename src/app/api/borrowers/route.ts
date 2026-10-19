import { requireUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { canManageMaster } from "@/lib/roles";
import { toStoredUpper } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const mode = url.searchParams.get("mode");
  const db = await getDb();

  if (mode === "master") {
    if (!canManageMaster(user.role)) {
      return jsonErr("Akun ini tidak boleh mengelola data master.", 403);
    }
    const { results } = await db
      .prepare(
        `SELECT id, name, display_name, divisi
         FROM borrowers WHERE deleted_at IS NULL
         ORDER BY name ASC`
      )
      .all();
    return jsonOk(results ?? []);
  }

  if (!q) {
    const { results } = await db
      .prepare(
        `SELECT id, name, display_name, divisi FROM borrowers
         WHERE deleted_at IS NULL ORDER BY name ASC LIMIT 40`
      )
      .all();
    return jsonOk(results ?? []);
  }

  const { results } = await db
    .prepare(
      `SELECT id, name, display_name, divisi FROM borrowers
       WHERE deleted_at IS NULL
         AND (name LIKE ? OR display_name LIKE ? OR divisi LIKE ?)
       ORDER BY name ASC LIMIT 40`
    )
    .bind(`%${q}%`, `%${q}%`, `%${q}%`)
    .all();
  return jsonOk(results ?? []);
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageMaster(user.role)) {
    return jsonErr("Akun ini tidak boleh menambah peminjam.", 403);
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      display_name?: string;
      divisi?: string;
    };
    const display = toStoredUpper(
      body.display_name ||
        body.name?.replace(/\s*\([^)]*\)\s*$/, "") ||
        ""
    );
    const divisi = toStoredUpper(body.divisi ?? "");
    if (!display) return jsonErr("Nama peminjam wajib diisi.", 400);

    const fullName = toStoredUpper(
      body.name || (divisi ? `${display} (${divisi})` : display)
    );

    const db = await getDb();
    const clash = await db
      .prepare(
        `SELECT id FROM borrowers WHERE deleted_at IS NULL AND name = ? LIMIT 1`
      )
      .bind(fullName)
      .first();
    if (clash) return jsonErr("Nama peminjam sudah ada.", 400);

    const res = await db
      .prepare(
        `INSERT INTO borrowers (name, display_name, divisi, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(fullName, display, divisi)
      .run();

    return jsonOk({
      id: Number(res.meta.last_row_id),
      name: fullName,
      display_name: display,
      divisi,
    });
  } catch (e) {
    return jsonErr(
      e instanceof Error ? e.message : "Gagal menambah peminjam",
      500
    );
  }
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageMaster(user.role)) {
    return jsonErr("Akun ini tidak boleh mengubah data peminjam.", 403);
  }

  try {
    const body = (await req.json()) as {
      id?: number;
      name?: string;
      display_name?: string;
      divisi?: string;
      deactivate?: boolean;
    };
    const id = Number(body.id);
    if (!id) return jsonErr("Data peminjam tidak valid.", 400);

    const db = await getDb();
    const existing = await db
      .prepare(
        `SELECT id, name, display_name, divisi FROM borrowers
         WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(id)
      .first<{
        id: number;
        name: string;
        display_name: string;
        divisi: string;
      }>();
    if (!existing) return jsonErr("Peminjam tidak ditemukan.", 404);

    if (body.deactivate) {
      await db
        .prepare(
          `UPDATE borrowers SET deleted_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(id)
        .run();
      return jsonOk({ id, deactivated: true });
    }

    const display = toStoredUpper(
      body.display_name !== undefined ? body.display_name : existing.display_name
    );
    const divisi = toStoredUpper(
      body.divisi !== undefined ? body.divisi : existing.divisi
    );
    const fullName = toStoredUpper(
      body.name || (divisi ? `${display} (${divisi})` : display)
    );

    if (!display) return jsonErr("Nama peminjam wajib diisi.", 400);

    const clash = await db
      .prepare(
        `SELECT id FROM borrowers
         WHERE deleted_at IS NULL AND id != ? AND name = ?
         LIMIT 1`
      )
      .bind(id, fullName)
      .first();
    if (clash) return jsonErr("Nama peminjam sudah dipakai.", 400);

    await db
      .prepare(
        `UPDATE borrowers
         SET name = ?, display_name = ?, divisi = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(fullName, display, divisi, id)
      .run();

    return jsonOk({
      id,
      name: fullName,
      display_name: display,
      divisi,
    });
  } catch (e) {
    return jsonErr(
      e instanceof Error ? e.message : "Gagal mengubah peminjam",
      500
    );
  }
}
