import { logActivity } from "@/lib/activity-log";
import {
  BACKUP_PAGE_SIZES,
  createBackup,
  getBackupMeta,
  getBackupPayload,
  listBackups,
  payloadToSql,
  type BackupPageSize,
} from "@/lib/backup";
import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { nowLocalSql, todayWibDate } from "@/lib/dates";
import { canBackupRestore } from "@/lib/roles";

export const dynamic = "force-dynamic";

function parsePageSize(raw: string | null): BackupPageSize {
  const n = Number(raw);
  if ((BACKUP_PAGE_SIZES as readonly number[]).includes(n)) {
    return n as BackupPageSize;
  }
  return 20;
}

function isSqlTs(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s);
}

function normalizeTs(raw: string | undefined | null): string | null {
  const s = raw?.trim() ?? "";
  if (!s) return null;
  const fromLocal = s.includes("T") ? s.replace("T", " ") : s;
  const padded = fromLocal.length === 16 ? `${fromLocal}:00` : fromLocal;
  if (!isSqlTs(padded)) return null;
  return padded.length === 16 ? `${padded}:00` : padded;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canBackupRestore(user.role)) {
    return jsonErr("Hanya Super Admin yang bisa membuka cadangan.", 403);
  }

  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id") || 0);
    const download = url.searchParams.get("download");

    if (id) {
      const meta = await getBackupMeta(id);
      if (!meta) return jsonErr("Cadangan tidak ditemukan.", 404);
      if (download === "sql" || download === "json") {
        const payload = await getBackupPayload(id);
        if (!payload) {
          return jsonErr("Isi cadangan tidak tersedia untuk diunduh.", 404);
        }
        if (download === "json") {
          const body = JSON.stringify(payload, null, 2);
          const name = meta.filename.replace(/\.sql$/i, ".json");
          return new Response(body, {
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Content-Disposition": `attachment; filename="${name}"`,
            },
          });
        }
        const sql = payloadToSql(payload);
        return new Response(sql, {
          headers: {
            "Content-Type": "application/sql; charset=utf-8",
            "Content-Disposition": `attachment; filename="${meta.filename}"`,
          },
        });
      }
      return jsonOk(meta);
    }

    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const pageSize = parsePageSize(url.searchParams.get("pageSize"));
    const sort = url.searchParams.get("sort") === "asc" ? "asc" : "desc";
    const { rows, total } = await listBackups({ page, pageSize, sort });
    return jsonOk({ page, pageSize, total, sort, rows });
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal memuat cadangan", 500);
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canBackupRestore(user.role)) {
    return jsonErr("Hanya Super Admin yang bisa membuat cadangan.", 403);
  }

  try {
    const body = (await req.json()) as {
      scope?: string;
      fromTs?: string;
      toTs?: string;
    };
    let fromTs: string | null = null;
    let toTs: string | null = null;
    const scope = body.scope ?? "full";
    if (scope === "today") {
      fromTs = `${todayWibDate()} 00:00:00`;
      toTs = nowLocalSql();
    } else if (scope === "range") {
      fromTs = normalizeTs(body.fromTs);
      toTs = normalizeTs(body.toTs);
      if (!fromTs || !toTs) {
        return jsonErr("Isi tanggal dan jam awal serta akhir.", 400);
      }
      if (fromTs > toTs) {
        return jsonErr("Waktu awal tidak boleh setelah waktu akhir.", 400);
      }
    } else if (scope !== "full") {
      return jsonErr("Pilih cadangan semua data, hari ini, atau rentang.", 400);
    }

    const record = await createBackup(user, fromTs, toTs);
    await logActivity(
      user,
      "backup_create",
      `#${record.id} · ${record.rows_stored} baris`,
      req
    );
    return jsonOk(record);
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal membuat cadangan", 500);
  }
}
