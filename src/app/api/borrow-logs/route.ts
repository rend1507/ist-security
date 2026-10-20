import { requireUser } from "@/lib/auth";
import { listBorrowLogsByDateRange } from "@/lib/borrow-logs";
import { jsonErr, jsonOk } from "@/lib/db";
import { isValidDateYmd, todayWibDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  try {
    const url = new URL(req.url);
    const today = todayWibDate();
    const from = url.searchParams.get("from")?.trim() || today;
    const to = url.searchParams.get("to")?.trim() || today;

    if (!isValidDateYmd(from) || !isValidDateYmd(to)) {
      return jsonErr("Format tanggal harus YYYY-MM-DD.", 400);
    }
    if (from > to) {
      return jsonErr("Tanggal awal tidak boleh setelah tanggal akhir.", 400);
    }

    const rows = await listBorrowLogsByDateRange(from, to);
    return jsonOk({ from, to, rows });
  } catch (e) {
    return jsonErr(
      e instanceof Error ? e.message : "Gagal memuat log kunci",
      500
    );
  }
}
