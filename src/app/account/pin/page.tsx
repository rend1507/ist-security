import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/require-page-user";
import { canChangeOwnPin } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ganti PIN" };

/** Ganti PIN sekarang dari popup sidebar — URL lama diarahkan. */
export default async function ChangePinPage() {
  const user = await requirePageUser();
  if (!canChangeOwnPin(user.role)) {
    redirect("/admin/master");
  }
  redirect("/dashboard");
}
