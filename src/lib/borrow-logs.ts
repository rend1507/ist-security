import { getDb } from "@/lib/db";

export type BorrowLogListRow = {
  id: number;
  key_code: string;
  key_jenis: string;
  borrower_name: string;
  borrower_divisi: string;
  take_out_at: string;
  give_back_at: string | null;
  taken_by: string | null;
  returned_by: string | null;
};

/**
 * Riwayat pinjam/kembali per baris log (bukan ringkas per kunci).
 * Filter berdasarkan tanggal pinjam (take_out_at) WIB `YYYY-MM-DD`.
 */
export async function listBorrowLogsByDateRange(
  fromYmd: string,
  toYmd: string
): Promise<BorrowLogListRow[]> {
  const db = await getDb();
  const fromSql = `${fromYmd} 00:00:00`;
  const toSql = `${toYmd} 23:59:59`;
  const { results } = await db
    .prepare(
      `SELECT
        bl.id,
        k.code AS key_code,
        k.jenis AS key_jenis,
        bl.borrower_name,
        bl.borrower_divisi,
        bl.take_out_at,
        bl.give_back_at,
        tu.name AS taken_by,
        ru.name AS returned_by
      FROM borrow_logs bl
      INNER JOIN keys k ON k.id = bl.key_id
      LEFT JOIN users tu ON tu.id = bl.taken_by_user_id
      LEFT JOIN users ru ON ru.id = bl.returned_by_user_id
      WHERE bl.take_out_at >= ?
        AND bl.take_out_at <= ?
      ORDER BY bl.take_out_at DESC, bl.id DESC`
    )
    .bind(fromSql, toSql)
    .all<BorrowLogListRow>();

  return results ?? [];
}
