import { getSessionUser } from "@/lib/auth";
import { jsonErr, jsonOk } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonErr("Belum masuk.", 401);
  return jsonOk(user);
}
