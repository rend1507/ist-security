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
  const stillOutRows = rows.filter(
    (r) => r.status === "out" || r.status === "overdue"
  );
  const available = rows.filter((r) => r.status === "available").length;
  const returnedOnly = rows.filter((r) => r.status === "returned").length;
  const outOnly = rows.filter((r) => r.status === "out").length;
  const overdue = rows.filter((r) => r.status === "overdue").length;
  /** Siap + sudah kembali (kunci di rak / selesai) */
  const returned = available + returnedOnly;
  const stillOut = stillOutRows.length;
  const returnedPct = total ? returned / total : 0;
  const stillOutPct = total ? stillOut / total : 0;

  const borrowerCount = new Map<string, number>();
  for (const r of rows) {
    if (r.peminjam && r.peminjam !== "—") {
      borrowerCount.set(r.peminjam, (borrowerCount.get(r.peminjam) ?? 0) + 1);
    }
  }
  const topBorrowers = [...borrowerCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  /** Top 3 longest — semua transaksi yang punya durasi (sesuai Excel SUMMARY) */
  const topLongest = [...rows]
    .filter((r) => r.durasi_ms > 0)
    .sort((a, b) => b.durasi_ms - a.durasi_ms)
    .slice(0, 3)
    .map((r) => ({
      code: r.code,
      jenis: r.jenis,
      peminjam: r.peminjam,
      durasi_ms: r.durasi_ms,
      status: r.status,
    }));

  /** Top take-out belum kembali (Excel: TOP 3 TAKE OUT NOT BACK) */
  const notBack = stillOutRows
    .sort((a, b) => b.durasi_ms - a.durasi_ms)
    .slice(0, 3)
    .map((r) => ({
      code: r.code,
      jenis: r.jenis,
      peminjam: r.peminjam,
      take_out: r.take_out,
      durasi_ms: r.durasi_ms,
      status: r.status,
    }));

  return {
    total,
    available,
    returned,
    returnedOnly,
    stillOut,
    outOnly,
    overdue,
    returnedPct,
    stillOutPct,
    topBorrowers,
    topLongest,
    notBack,
    defaultOverdueMinutes,
    updatedAt: new Date().toISOString(),
  };
}
