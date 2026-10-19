import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { canTransact } from "@/lib/roles";
import { takeOutKey } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canTransact(user.role)) {
    return jsonErr("Akun ini tidak boleh meminjamkan kunci.", 403);
  }

  try {
    const body = (await req.json()) as {
      pin?: string;
      keyCode?: string;
      borrowerName?: string;
      borrowerDivisi?: string;
      clientUuid?: string;
    };
    const result = await takeOutKey({
      user,
      pin: body.pin ?? "",
      keyCode: body.keyCode ?? "",
      borrowerName: body.borrowerName ?? "",
      borrowerDivisi: body.borrowerDivisi,
      clientUuid: body.clientUuid,
    });
    if (!result.ok) return jsonErr(result.error, 400);
    return jsonOk(result.data);
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal catat pinjam", 500);
  }
}
