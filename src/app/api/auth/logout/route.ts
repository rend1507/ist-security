import { clearSessionCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
