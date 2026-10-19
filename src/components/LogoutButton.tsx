"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "@/components/Icons";
import { btnCancel } from "@/lib/ui";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${btnCancel} !px-3 !py-2 text-sm`}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <IconLogout className="h-4 w-4" />
      Keluar
    </button>
  );
}
