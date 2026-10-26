import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { isValidDateYmd, todayWibDate, wibDateDaysAgo } from "@/lib/dates";
import { canViewSessionLogs } from "@/lib/roles";
import {
  SESSION_LOG_PAGE_SIZES,
  listSessionAccessLogs,
  summarizeSessionAccessLogs,
  type SessionLogPageSize,
} from "@/lib/session-logs";

export const dynamic = "force-dynamic";

function parsePageSize(raw: string | null): SessionLogPageSize {
  const n = Number(raw);
  if ((SESSION_LOG_PAGE_SIZES as readonly number[]).includes(n)) {
    return n as SessionLogPageSize;
  }
  return 20;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canViewSessionLogs(user.role)) {
    return jsonErr("Hanya Super Admin yang bisa melihat log akses.", 403);
  }

  try {
    const url = new URL(req.url);
    const today = todayWibDate();
    const from =
      url.searchParams.get("from")?.trim() || wibDateDaysAgo(6);
    const to = url.searchParams.get("to")?.trim() || today;
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const pageSize = parsePageSize(url.searchParams.get("pageSize"));
    const summaryOnly = url.searchParams.get("summary") === "1";

    if (!isValidDateYmd(from) || !isValidDateYmd(to)) {
      return jsonErr("Format tanggal harus YYYY-MM-DD.", 400);
    }
    if (from > to) {
      return jsonErr("Tanggal awal tidak boleh setelah tanggal akhir.", 400);
    }

    if (summaryOnly) {
      const summary = await summarizeSessionAccessLogs(from, to);
      return jsonOk({ from, to, summary });
    }

    const { rows, total } = await listSessionAccessLogs({
      fromYmd: from,
      toYmd: to,
      page,
      pageSize,
    });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return jsonOk({
      from,
      to,
      page,
      pageSize,
      total,
      pageCount,
      rows,
    });
  } catch (e) {
    return jsonErr(
      e instanceof Error ? e.message : "Gagal memuat log akses",
      500
    );
  }
}
