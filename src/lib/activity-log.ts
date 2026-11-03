import type { SessionUser } from "@/lib/auth";
import { clientIpFromRequest } from "@/lib/rate-limit";
import {
  recordSessionAccess,
  type SessionAccessEvent,
} from "@/lib/session-logs";

/** Jangan gagalkan aksi utama jika tulis log gagal. */
export async function logActivity(
  actor: SessionUser,
  event: SessionAccessEvent,
  detail: string | null,
  req?: Request
): Promise<void> {
  try {
    await recordSessionAccess({
      userId: actor.id,
      username: actor.username,
      name: actor.name,
      role: actor.role,
      event,
      detail,
      ip: req ? clientIpFromRequest(req) : null,
      userAgent: req?.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[IST activity-log]", event, err);
  }
}
