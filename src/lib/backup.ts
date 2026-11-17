import type { SessionUser } from "@/lib/auth";
import type {
  BackupKind,
  BackupPageSize,
  BackupPayload,
  BackupRecord,
  TableDump,
  TableSummary,
} from "@/lib/backup-shared";
import { nowLocalSql } from "@/lib/dates";
import { getBackupBucket, getDb } from "@/lib/db";

export {
  BACKUP_KIND_LABELS,
  BACKUP_KINDS,
  BACKUP_PAGE_SIZES,
  isRestoreQuietHours,
  wibHour,
} from "@/lib/backup-shared";
export type {
  BackupKind,
  BackupPageSize,
  BackupPayload,
  BackupRecord,
  TableDump,
  TableSummary,
} from "@/lib/backup-shared";

const LOG_TABLES = [
  "borrow_logs",
  "borrow_edit_logs",
  "pin_change_logs",
  "session_access_logs",
] as const;

const INSERT_ORDER = [
  "users",
  "keys",
  "borrowers",
  "app_settings",
  "borrow_logs",
  "borrow_edit_logs",
  "pin_change_logs",
  "session_access_logs",
] as const;

const DELETE_ORDER = [...INSERT_ORDER].reverse();

type BackupRowDb = Omit<BackupRecord, "summary"> & { summary_json: string };

function parseSummary(raw: string): TableSummary[] {
  try {
    const parsed = JSON.parse(raw) as TableSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapRecord(row: BackupRowDb): BackupRecord {
  return {
    id: row.id,
    kind: row.kind,
    mode: row.mode,
    filename: row.filename,
    from_ts: row.from_ts,
    to_ts: row.to_ts,
    summary: parseSummary(row.summary_json),
    rows_stored: row.rows_stored,
    rows_removed: row.rows_removed,
    rows_updated: row.rows_updated,
    restore_point_id: row.restore_point_id,
    created_by_user_id: row.created_by_user_id,
    created_by_username: row.created_by_username,
    created_at: row.created_at,
  };
}

function sqlIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error("Nama tabel tidak valid.");
  }
  return name;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function tableExists(db: D1Database, name: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
    )
    .bind(name)
    .first<{ name: string }>();
  return Boolean(row?.name);
}

async function tableColumns(db: D1Database, name: string): Promise<string[]> {
  const { results } = await db
    .prepare(`PRAGMA table_info(${sqlIdent(name)})`)
    .all<{ name: string }>();
  return (results ?? []).map((c) => c.name);
}

function inRangeSql(column: string, fromTs: string | null, toTs: string | null) {
  if (!fromTs && !toTs) return { sql: "", binds: [] as string[] };
  if (fromTs && toTs) {
    return { sql: ` WHERE ${column} >= ? AND ${column} <= ?`, binds: [fromTs, toTs] };
  }
  if (fromTs) return { sql: ` WHERE ${column} >= ?`, binds: [fromTs] };
  return { sql: ` WHERE ${column} <= ?`, binds: [toTs!] };
}

async function dumpTable(
  db: D1Database,
  table: string,
  fromTs: string | null,
  toTs: string | null
): Promise<TableDump> {
  const columns = await tableColumns(db, table);
  const isLog = (LOG_TABLES as readonly string[]).includes(table);
  const dateCol =
    table === "borrow_logs"
      ? "take_out_at"
      : isLog
        ? "created_at"
        : null;
  const filter =
    isLog && dateCol ? inRangeSql(dateCol, fromTs, toTs) : { sql: "", binds: [] as string[] };

  const orderCol = table === "app_settings" ? "key" : "id";
  const stmt = db.prepare(
    `SELECT * FROM ${sqlIdent(table)}${filter.sql} ORDER BY ${orderCol} ASC`
  );
  const { results } =
    filter.binds.length > 0
      ? await stmt.bind(...filter.binds).all<Record<string, unknown>>()
      : await stmt.all<Record<string, unknown>>();

  let rows = results ?? [];
  if (table === "borrow_edit_logs" && (fromTs || toTs)) {
    const logFilter = inRangeSql("take_out_at", fromTs, toTs);
    const logs = await db
      .prepare(
        `SELECT id FROM borrow_logs${logFilter.sql}`
      )
      .bind(...logFilter.binds)
      .all<{ id: number }>();
    const ids = new Set((logs.results ?? []).map((r) => r.id));
    rows = rows.filter((r) => ids.has(Number(r.borrow_log_id)));
  }

  return { table, columns, rows };
}

export async function buildPayload(
  fromTs: string | null,
  toTs: string | null
): Promise<BackupPayload> {
  const db = await getDb();
  const tables: TableDump[] = [];
  for (const table of INSERT_ORDER) {
    if (!(await tableExists(db, table))) continue;
    tables.push(await dumpTable(db, table, fromTs, toTs));
  }
  return {
    version: 1,
    created_at: nowLocalSql(),
    from_ts: fromTs,
    to_ts: toTs,
    tables,
  };
}

export function summarizePayload(payload: BackupPayload): TableSummary[] {
  return payload.tables.map((t) => ({ table: t.table, rows: t.rows.length }));
}

export function countStored(payload: BackupPayload): number {
  return payload.tables.reduce((n, t) => n + t.rows.length, 0);
}

export function payloadToSql(payload: BackupPayload): string {
  const range =
    payload.from_ts || payload.to_ts
      ? `-- Rentang: ${payload.from_ts ?? "awal"} s.d. ${payload.to_ts ?? "akhir"}`
      : "-- Rentang: semua data";
  const lines = [
    "-- IST Security — cadangan data",
    `-- Dibuat: ${payload.created_at}`,
    range,
    "-- File SQL untuk arsip. Pulihkan lewat aplikasi (JSON / Riwayat), bukan jalankan SQL mentah.",
    "PRAGMA foreign_keys=OFF;",
    "BEGIN;",
  ];
  for (const table of DELETE_ORDER) {
    if (payload.tables.some((t) => t.table === table)) {
      lines.push(`DELETE FROM ${table};`);
    }
  }
  for (const dump of payload.tables) {
    if (dump.rows.length === 0) continue;
    const cols = dump.columns.join(", ");
    for (const row of dump.rows) {
      const values = dump.columns.map((c) => sqlLiteral(row[c])).join(", ");
      lines.push(`INSERT INTO ${dump.table} (${cols}) VALUES (${values});`);
    }
  }
  lines.push("COMMIT;", "PRAGMA foreign_keys=ON;", "");
  return lines.join("\n");
}

function backupFilename(createdAt: string, ext: "sql" | "json"): string {
  const stamp = createdAt.replace(":", "-").replace(":", "-");
  return `${stamp} | Cadangan - IST Security.${ext}`;
}

function r2ObjectKey(id: number): string {
  return `backups/${id}.json`;
}

async function putPayloadR2(id: number, payload: BackupPayload): Promise<void> {
  const bucket = await getBackupBucket();
  await bucket.put(r2ObjectKey(id), JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function saveBackupRecord(opts: {
  actor: SessionUser;
  kind: BackupKind;
  mode: string | null;
  payload: BackupPayload | null;
  fromTs: string | null;
  toTs: string | null;
  rowsStored: number;
  rowsRemoved: number;
  rowsUpdated: number;
  restorePointId: number | null;
  summary: TableSummary[];
}): Promise<BackupRecord> {
  const db = await getDb();
  const createdAt = nowLocalSql();
  const filename = backupFilename(createdAt, "sql");
  const res = await db
    .prepare(
      `INSERT INTO data_backups (
         kind, mode, filename, from_ts, to_ts, summary_json, payload_json,
         rows_stored, rows_removed, rows_updated, restore_point_id,
         created_by_user_id, created_by_username, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      opts.kind,
      opts.mode,
      filename,
      opts.fromTs,
      opts.toTs,
      JSON.stringify(opts.summary),
      null,
      opts.rowsStored,
      opts.rowsRemoved,
      opts.rowsUpdated,
      opts.restorePointId,
      opts.actor.id,
      opts.actor.username,
      createdAt
    )
    .run();

  const id = Number(res.meta.last_row_id);
  if (opts.payload) {
    await putPayloadR2(id, opts.payload);
  }

  return {
    id,
    kind: opts.kind,
    mode: opts.mode,
    filename,
    from_ts: opts.fromTs,
    to_ts: opts.toTs,
    summary: opts.summary,
    rows_stored: opts.rowsStored,
    rows_removed: opts.rowsRemoved,
    rows_updated: opts.rowsUpdated,
    restore_point_id: opts.restorePointId,
    created_by_user_id: opts.actor.id,
    created_by_username: opts.actor.username,
    created_at: createdAt,
  };
}

export async function createBackup(
  actor: SessionUser,
  fromTs: string | null,
  toTs: string | null
): Promise<BackupRecord> {
  const payload = await buildPayload(fromTs, toTs);
  const summary = summarizePayload(payload);
  return saveBackupRecord({
    actor,
    kind: "backup",
    mode: fromTs || toTs ? "range" : "full",
    payload,
    fromTs,
    toTs,
    rowsStored: countStored(payload),
    rowsRemoved: 0,
    rowsUpdated: 0,
    restorePointId: null,
    summary,
  });
}

export async function listBackups(opts: {
  page: number;
  pageSize: BackupPageSize;
  sort: "asc" | "desc";
}): Promise<{ rows: BackupRecord[]; total: number }> {
  const db = await getDb();
  const page = Math.max(1, opts.page);
  const offset = (page - 1) * opts.pageSize;
  const order = opts.sort === "asc" ? "ASC" : "DESC";
  const totalRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM data_backups`)
    .first<{ n: number }>();
  const { results } = await db
    .prepare(
      `SELECT id, kind, mode, filename, from_ts, to_ts, summary_json,
              rows_stored, rows_removed, rows_updated, restore_point_id,
              created_by_user_id, created_by_username, created_at
       FROM data_backups
       ORDER BY created_at ${order}, id ${order}
       LIMIT ? OFFSET ?`
    )
    .bind(opts.pageSize, offset)
    .all<BackupRowDb>();
  return {
    rows: (results ?? []).map(mapRecord),
    total: Number(totalRow?.n ?? 0),
  };
}

export async function getBackupMeta(id: number): Promise<BackupRecord | null> {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, kind, mode, filename, from_ts, to_ts, summary_json,
              rows_stored, rows_removed, rows_updated, restore_point_id,
              created_by_user_id, created_by_username, created_at
       FROM data_backups WHERE id = ?`
    )
    .bind(id)
    .first<BackupRowDb>();
  return row ? mapRecord(row) : null;
}

export async function getBackupPayload(id: number): Promise<BackupPayload | null> {
  const bucket = await getBackupBucket();
  const object = await bucket.get(r2ObjectKey(id));
  if (object) {
    try {
      const parsed = (await object.json()) as BackupPayload;
      if (parsed?.version !== 1 || !Array.isArray(parsed.tables)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  const db = await getDb();
  const row = await db
    .prepare(`SELECT payload_json FROM data_backups WHERE id = ?`)
    .bind(id)
    .first<{ payload_json: string | null }>();
  if (!row?.payload_json) return null;
  try {
    const parsed = JSON.parse(row.payload_json) as BackupPayload;
    if (parsed?.version !== 1 || !Array.isArray(parsed.tables)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseUploadedPayload(raw: unknown): BackupPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as BackupPayload;
  if (p.version !== 1 || !Array.isArray(p.tables)) return null;
  for (const t of p.tables) {
    if (!t?.table || !Array.isArray(t.columns) || !Array.isArray(t.rows)) {
      return null;
    }
    if (!(INSERT_ORDER as readonly string[]).includes(t.table)) return null;
  }
  return {
    version: 1,
    created_at: typeof p.created_at === "string" ? p.created_at : nowLocalSql(),
    from_ts: p.from_ts ?? null,
    to_ts: p.to_ts ?? null,
    tables: p.tables,
  };
}

async function existingIds(db: D1Database, table: string): Promise<Set<number>> {
  if (table === "app_settings") return new Set();
  const { results } = await db
    .prepare(`SELECT id FROM ${sqlIdent(table)}`)
    .all<{ id: number }>();
  return new Set((results ?? []).map((r) => Number(r.id)));
}

async function insertRow(
  db: D1Database,
  table: string,
  columns: string[],
  row: Record<string, unknown>
): Promise<void> {
  const cols = columns.map(sqlIdent);
  const placeholders = cols.map(() => "?").join(", ");
  await db
    .prepare(
      `INSERT INTO ${sqlIdent(table)} (${cols.join(", ")}) VALUES (${placeholders})`
    )
    .bind(...columns.map((c) => (row[c] === undefined ? null : row[c])))
    .run();
}

async function updateRow(
  db: D1Database,
  table: string,
  columns: string[],
  row: Record<string, unknown>
): Promise<void> {
  if (table === "app_settings") {
    await db
      .prepare(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .bind(row.key, row.value)
      .run();
    return;
  }
  const sets = columns.filter((c) => c !== "id");
  if (sets.length === 0) return;
  await db
    .prepare(
      `UPDATE ${sqlIdent(table)} SET ${sets.map((c) => `${sqlIdent(c)} = ?`).join(", ")} WHERE id = ?`
    )
    .bind(...sets.map((c) => (row[c] === undefined ? null : row[c])), row.id)
    .run();
}

export async function restorePayload(
  actor: SessionUser,
  payload: BackupPayload,
  mode: "replace" | "merge"
): Promise<BackupRecord> {
  const db = await getDb();
  const pointPayload = await buildPayload(null, null);
  const restorePoint = await saveBackupRecord({
    actor,
    kind: "restore_point",
    mode: "full",
    payload: pointPayload,
    fromTs: null,
    toTs: null,
    rowsStored: countStored(pointPayload),
    rowsRemoved: 0,
    rowsUpdated: 0,
    restorePointId: null,
    summary: summarizePayload(pointPayload),
  });

  let removed = 0;
  let updated = 0;
  let stored = 0;
  const dumps = INSERT_ORDER.map((name) =>
    payload.tables.find((t) => t.table === name)
  ).filter((t): t is TableDump => Boolean(t));

  if (mode === "replace") {
    for (const table of DELETE_ORDER) {
      if (!(await tableExists(db, table))) continue;
      if (!dumps.some((t) => t.table === table)) continue;
      const countRow = await db
        .prepare(`SELECT COUNT(*) AS n FROM ${sqlIdent(table)}`)
        .first<{ n: number }>();
      removed += Number(countRow?.n ?? 0);
      await db.prepare(`DELETE FROM ${sqlIdent(table)}`).run();
    }
    for (const dump of dumps) {
      if (!(await tableExists(db, dump.table))) continue;
      const columns =
        dump.columns.length > 0
          ? dump.columns
          : await tableColumns(db, dump.table);
      for (const row of dump.rows) {
        await insertRow(db, dump.table, columns, row);
        stored += 1;
      }
    }
  } else {
    for (const dump of dumps) {
      if (!(await tableExists(db, dump.table))) continue;
      const columns =
        dump.columns.length > 0
          ? dump.columns
          : await tableColumns(db, dump.table);
      const ids = await existingIds(db, dump.table);
      for (const row of dump.rows) {
        const id = Number(row.id);
        if (dump.table === "app_settings") {
          await updateRow(db, dump.table, columns, row);
          updated += 1;
        } else if (ids.has(id)) {
          await updateRow(db, dump.table, columns, row);
          updated += 1;
        } else {
          await insertRow(db, dump.table, columns, row);
          stored += 1;
        }
      }
    }
  }

  return saveBackupRecord({
    actor,
    kind: "restore",
    mode,
    payload: null,
    fromTs: payload.from_ts,
    toTs: payload.to_ts,
    rowsStored: stored,
    rowsRemoved: removed,
    rowsUpdated: updated,
    restorePointId: restorePoint.id,
    summary: summarizePayload(payload),
  });
}
