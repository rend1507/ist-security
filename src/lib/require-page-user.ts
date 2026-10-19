import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth";

export async function requirePageUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
