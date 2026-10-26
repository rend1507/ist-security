import { clearSessionCookie, getSessionUser } from "@/lib/auth";
import { jsonOk } from "@/lib/db";
import { clientIpFromRequest } from "@/lib/rate-limit";
import { recordSessionAccess } from "@/lib/session-logs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (user) {
    try {
      await recordSessionAccess({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        event: "logout",
        ip: clientIpFromRequest(req),
        userAgent: req.headers.get("user-agent"),
      });
    } catch {
      /* jangan gagalkan logout jika log audit gagal */
    }
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
}
