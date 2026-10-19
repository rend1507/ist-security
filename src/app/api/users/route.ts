import { requireUser } from "@/lib/auth";
import { getDb, jsonErr, jsonOk } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hashPin } from "@/lib/pin";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  canManageUsers,
  type Role,
} from "@/lib/roles";

export const dynamic = "force-dynamic";

function isAssignableRole(role: string): role is Role {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageUsers(user.role)) {
    return jsonErr("Hanya Super Admin yang mengelola akun petugas.", 403);
  }

  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT id, username, name, role, email FROM users
       WHERE deleted_at IS NULL ORDER BY username ASC`
    )
    .all();
  return jsonOk(
    (results ?? []).map((r) => {
      const row = r as {
        id: number;
        username: string;
        name: string;
        role: string;
        email: string | null;
      };
      return {
        ...row,
        role_label: ROLE_LABELS[row.role as Role] || row.role,
      };
    })
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageUsers(user.role)) {
    return jsonErr("Hanya Super Admin yang menambah akun.", 403);
  }

  try {
    const body = (await req.json()) as {
      username?: string;
      name?: string;
      role?: string;
      password?: string;
      pin?: string;
      email?: string;
    };
    const username = body.username?.trim().toLowerCase() ?? "";
    const name = body.name?.trim() ?? "";
    const role = body.role?.trim() ?? "security";
    const password = body.password?.trim() ?? "";
    const pin = body.pin?.trim() ?? "";
    const email =
      body.email?.trim() || `${username}@ist-security.local`;

    if (!username || !name) {
      return jsonErr("ID dan nama wajib diisi.", 400);
    }
    if (role === "superadmin" || !isAssignableRole(role)) {
      return jsonErr(
        "Super Admin tidak bisa ditambahkan lewat aplikasi. Pilih peran lain.",
        400
      );
    }
    if (password.length < 6) {
      return jsonErr("Password minimal 6 karakter.", 400);
    }

    const db = await getDb();
    const clash = await db
      .prepare(
        `SELECT id FROM users WHERE lower(username) = ? AND deleted_at IS NULL`
      )
      .bind(username)
      .first();
    if (clash) return jsonErr("ID petugas sudah dipakai.", 400);

    const password_hash = await hashPassword(password);
    const pin_hash = await hashPin(pin || "123456");

    const res = await db
      .prepare(
        `INSERT INTO users (
          username, name, password_hash, pin_hash, role, email,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(username, name, password_hash, pin_hash, role, email)
      .run();

    return jsonOk({
      id: Number(res.meta.last_row_id),
      username,
      name,
      role,
      role_label: ROLE_LABELS[role as Role] || role,
    });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal menambah akun", 500);
  }
}

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canManageUsers(user.role)) {
    return jsonErr("Hanya Super Admin yang mengubah akun.", 403);
  }

  try {
    const body = (await req.json()) as {
      id?: number;
      name?: string;
      role?: string;
      deactivate?: boolean;
    };
    const id = Number(body.id);
    if (!id) return jsonErr("Akun tidak valid.", 400);

    const db = await getDb();
    const existing = await db
      .prepare(
        `SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL`
      )
      .bind(id)
      .first<{ id: number; role: string }>();
    if (!existing) return jsonErr("Akun tidak ditemukan.", 404);

    if (body.deactivate) {
      if (id === user.id) {
        return jsonErr("Super Admin tidak bisa menonaktifkan akun sendiri.", 400);
      }
      if (existing.role === "superadmin") {
        return jsonErr("Akun Super Admin tidak bisa dinonaktifkan lewat aplikasi.", 400);
      }
      await db
        .prepare(
          `UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(id)
        .run();
      return jsonOk({ id, deactivated: true });
    }

    const name = body.name?.trim();
    const role = body.role?.trim();
    if (role != null) {
      if (role === "superadmin" || !isAssignableRole(role)) {
        return jsonErr(
          "Tidak bisa menetapkan peran Super Admin lewat aplikasi.",
          400
        );
      }
      if (existing.role === "superadmin") {
        return jsonErr("Peran Super Admin tidak bisa diubah lewat aplikasi.", 400);
      }
    }

    await db
      .prepare(
        `UPDATE users
         SET name = COALESCE(?, name),
             role = COALESCE(?, role),
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(name ?? null, role ?? null, id)
      .run();

    return jsonOk({ id, updated: true });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal mengubah akun", 500);
  }
}
