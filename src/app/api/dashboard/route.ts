import { requireUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";
import { getDashboardStats } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  try {
    const data = await getDashboardStats();
    return jsonOk(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal baca ringkasan";
    return jsonErr(msg, 500);
  }
}
