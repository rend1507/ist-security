import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { canTransact } from "@/lib/roles";
import { editBorrowTimes } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  if (!canTransact(user.role)) {
    return jsonErr("Akun ini tidak boleh mengubah jam.", 403);
  }

  try {
    const body = (await req.json()) as {
      pin?: string;
      logId?: number;
      takeOutAt?: string;
      giveBackAt?: string | null;
    };
    if (!body.logId) return jsonErr("Catatan pinjam tidak valid.", 400);
    const result = await editBorrowTimes({
      user,
      pin: body.pin ?? "",
      logId: Number(body.logId),
      takeOutAt: body.takeOutAt,
      giveBackAt: body.giveBackAt,
    });
    if (!result.ok) return jsonErr(result.error, 400);
    return jsonOk(result.data);
  } catch (e) {
    return jsonErr(e instanceof Error ? e.message : "Gagal ubah jam", 500);
  }
}
