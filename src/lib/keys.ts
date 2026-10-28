import { currentMonthWibRange } from "@/lib/dates";
import { getDb } from "@/lib/db";
import {
  DEFAULT_OVERDUE_MINUTES,
  classifyStatus,
  durationMs,
  effectiveOverdueMinutes,
  type KeyLogView,
} from "@/lib/domain";

export async function getDefaultOverdueMinutes(): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT value FROM app_settings WHERE key = ?")
    .bind("default_overdue_minutes")
    .first<{ value: string }>();
  const n = row ? Number(row.value) : DEFAULT_OVERDUE_MINUTES;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_OVERDUE_MINUTES;
}

type JoinRow = {
  key_id: number;
  code: string;
  jenis: string;
  barcode: string;
  key_status: string;
  overdue_minutes: number | null;
  log_id: number | null;
  borrower_name: string | null;
  borrower_divisi: string | null;
  take_out_at: string | null;
  give_back_at: string | null;
  edit_count: number | null;
};

export async function listKeyLogViews(): Promise<{
  rows: KeyLogView[];
  defaultOverdueMinutes: number;
}> {
  const db = await getDb();
  const defaultOverdue = await getDefaultOverdueMinutes();
  const { results } = await db
    .prepare(
      `SELECT
        k.id AS key_id,
        k.code,
        k.jenis,
        k.barcode,
        k.status AS key_status,
        k.overdue_minutes,
        bl.id AS log_id,
        bl.borrower_name,
        bl.borrower_divisi,
        bl.take_out_at,
        bl.give_back_at,
        COALESCE(bl.edit_count, 0) AS edit_count
      FROM keys k
      LEFT JOIN borrow_logs bl
        ON bl.id = (
          SELECT id FROM borrow_logs
          WHERE key_id = k.id
          ORDER BY take_out_at DESC, id DESC
          LIMIT 1
        )
      WHERE k.deleted_at IS NULL
      ORDER BY CAST(substr(k.code, 4) AS INTEGER) ASC, k.code ASC`
    )
    .all<JoinRow>();

  const now = Date.now();
  const rows: KeyLogView[] = (results ?? []).map((r, idx) => {
    const overdueMin = effectiveOverdueMinutes(r.overdue_minutes, defaultOverdue);
    const takeOut = r.take_out_at;
    const giveBack = r.give_back_at;
    const status = classifyStatus(
      r.key_status,
      takeOut,
      giveBack,
      overdueMin,
      now
    );
    return {
      no: idx + 1,
      key_id: r.key_id,
      code: r.code,
      jenis: r.jenis,
      barcode: r.barcode,
      peminjam: r.borrower_name ?? "—",
      divisi: r.borrower_divisi ?? "",
      take_out: takeOut,
      give_back: giveBack,
      durasi_ms:
        takeOut && (status === "out" || status === "overdue" || status === "returned")
          ? durationMs(takeOut, giveBack, now)
          : 0,
      status,
      overdue_minutes: overdueMin,
      log_id: r.log_id,
      edit_count: r.edit_count ?? 0,
    };
  });

  return { rows, defaultOverdueMinutes: defaultOverdue };
}

export async function getDashboardStats() {
  const { rows, defaultOverdueMinutes } = await listKeyLogViews();
  const total = rows.length;

  /** Empat bucket eksklusif — harus selalu = total */
  const available = rows.filter((r) => r.status === "available").length;
  const returnedOnly = rows.filter((r) => r.status === "returned").length;
  const outOnly = rows.filter((r) => r.status === "out").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;

  const stillOutRows = rows.filter(
    (r) => r.status === "out" || r.status === "overdue"
  );
  /** Kunci di rak (siap + sudah kembali) — bukan "masih dibawa/terlambat" */
  const onRack = available + returnedOnly;
  const stillOut = outOnly + overdue;
  const returnedPct = total ? onRack / total : 0;
  const stillOutPct = total ? stillOut / total : 0;

  /** Alias lama `returned` = di rak (untuk kartu dashboard) */
  const returned = onRack;

  const month = currentMonthWibRange();
  const fromSql = `${month.fromYmd} 00:00:00`;
  const toSql = `${month.toYmd} 23:59:59`;
  const db = await getDb();
  const now = Date.now();

  /** Ranking bulan berjalan (WIB) — tidak kecampur bulan lalu */
  const { results: monthBorrowers } = await db
    .prepare(
      `SELECT borrower_name AS name, COUNT(*) AS count
       FROM borrow_logs
       WHERE take_out_at >= ? AND take_out_at <= ?
         AND borrower_name IS NOT NULL AND trim(borrower_name) != ''
       GROUP BY borrower_name
       ORDER BY count DESC, borrower_name ASC
       LIMIT 3`
    )
    .bind(fromSql, toSql)
    .all<{ name: string; count: number }>();

  const topBorrowers = (monthBorrowers ?? []).map((b) => ({
    name: b.name,
    count: Number(b.count),
  }));

  const { results: monthLogs } = await db
    .prepare(
      `SELECT
         k.code,
         k.jenis,
         bl.borrower_name AS peminjam,
         bl.take_out_at AS take_out,
         bl.give_back_at AS give_back
       FROM borrow_logs bl
       INNER JOIN keys k ON k.id = bl.key_id
       WHERE bl.take_out_at >= ? AND bl.take_out_at <= ?`
    )
    .bind(fromSql, toSql)
    .all<{
      code: string;
      jenis: string;
      peminjam: string;
      take_out: string;
      give_back: string | null;
    }>();

  const topLongest = (monthLogs ?? [])
    .map((r) => ({
      code: r.code,
      jenis: r.jenis,
      peminjam: r.peminjam || "—",
      take_out: r.take_out,
      give_back: r.give_back,
      durasi_ms: durationMs(r.take_out, r.give_back, now),
      status: r.give_back ? "returned" : "out",
    }))
    .filter((r) => r.durasi_ms > 0)
    .sort((a, b) => b.durasi_ms - a.durasi_ms)
    .slice(0, 3);

  /** Belum kembali — realtime (status kunci sekarang) */
  const notBack = stillOutRows
    .sort((a, b) => b.durasi_ms - a.durasi_ms)
    .slice(0, 8)
    .map((r) => ({
      code: r.code,
      jenis: r.jenis,
      peminjam: r.peminjam,
      take_out: r.take_out,
      give_back: null as string | null,
      durasi_ms: r.durasi_ms,
      status: r.status,
    }));

  return {
    total,
    available,
    returned,
    returnedOnly,
    onRack,
    stillOut,
    outOnly,
    overdue,
    returnedPct,
    stillOutPct,
    /** Sanity: available + returnedOnly + outOnly + overdue */
    chartSum: available + returnedOnly + outOnly + overdue,
    topBorrowers,
    topLongest,
    notBack,
    monthLabel: month.label,
    monthFrom: month.fromYmd,
    monthTo: month.toYmd,
    defaultOverdueMinutes,
    updatedAt: new Date().toISOString(),
  };
}
