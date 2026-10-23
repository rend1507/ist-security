"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { ChangePinForm } from "@/components/ChangePinForm";
import { HeaderClock } from "@/components/HeaderClock";
import {
  IconChart,
  IconClock,
  IconDatabase,
  IconKey,
  IconList,
  IconLock,
  IconMenu,
  IconSettings,
  IconClose,
} from "@/components/Icons";
import { LogoutButton } from "@/components/LogoutButton";
import { Modal } from "@/components/Modal";
import { SuperadminPanel } from "@/components/SuperadminPanel";
import {
  canChangeOwnPin,
  canManageMaster,
  canManageUsers,
  canSetOverdue,
} from "@/lib/roles";
import {
  pillActiveDark,
  pillIdleDark,
} from "@/lib/ui";

type NavKey = "dashboard" | "keys" | "logs" | "daftar" | "master";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
  active?: NavKey;
  user: SessionUser;
};

const NAV_ICONS: Record<NavKey, React.ReactNode> = {
  dashboard: <IconChart />,
  keys: <IconKey />,
  logs: <IconClock />,
  daftar: <IconList />,
  master: <IconDatabase />,
};

export function AppShell({ title, children, active, user }: AppShellProps) {
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const canUsers = canManageUsers(user.role);
  const canOverdue = canSetOverdue(user.role);
  const showSettings = canUsers || canOverdue;

  const nav: { href: string; label: string; key: NavKey }[] = [
    { href: "/dashboard", label: "Dashboard", key: "dashboard" },
    { href: "/keys", label: "Buku kunci", key: "keys" },
  ];
  if (canManageMaster(user.role)) {
    nav.push({ href: "/daftar-kunci", label: "Daftar kunci", key: "daftar" });
  }
  nav.push({ href: "/log-kunci", label: "Log kunci", key: "logs" });
  if (canManageMaster(user.role)) {
    nav.push({ href: "/admin/master", label: "Data peminjam", key: "master" });
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <div className="rounded-lg bg-slate-800/80 p-2">
          <p className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Menu
          </p>
          <div className="flex flex-col gap-1.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={
                  active === item.key ? pillActiveDark : pillIdleDark
                }
              >
                {NAV_ICONS[item.key]}
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {(canChangeOwnPin(user.role) || showSettings) && (
          <div className="rounded-lg bg-slate-800/80 p-2">
            <p className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Akun
            </p>
            <div className="flex flex-col gap-1.5">
              {canChangeOwnPin(user.role) && (
                <button
                  type="button"
                  onClick={() => {
                    setPinOpen(true);
                    onNavigate?.();
                  }}
                  className={pillIdleDark}
                >
                  <IconLock />
                  Ganti PIN
                </button>
              )}
              {showSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(true);
                    onNavigate?.();
                  }}
                  className={pillIdleDark}
                >
                  <IconSettings />
                  Pengaturan
                </button>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-base text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 text-slate-100 print:hidden md:flex">
          <div className="border-b border-slate-700 px-4 py-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              PT Indonesia Smelting Technology
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">IST Security</p>
          </div>
          <nav className="flex flex-1 flex-col gap-3 p-3">
            <NavLinks />
          </nav>
          <div className="border-t border-slate-700 p-3 text-base text-slate-300">
            <p className="font-semibold text-white">{user.name}</p>
            <p>{user.role_label}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b-2 border-slate-300 bg-white px-3 py-3 print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 md:px-6">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white text-slate-800 md:hidden"
                aria-label="Buka menu"
                onClick={() => setMenuOpen(true)}
              >
                <IconMenu />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {title}
                </h1>
                <p className="text-base text-slate-700 md:hidden">
                  {user.name} · {user.role_label}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
              <HeaderClock />
              <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-3 sm:gap-3 sm:pl-4">
                <span className="hidden font-mono text-base font-semibold text-slate-700 sm:inline">
                  {user.username}
                </span>
                <LogoutButton />
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 py-4 text-base print:p-0 sm:px-4 sm:py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 print:hidden md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-slate-900 text-slate-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4">
              <p className="text-lg font-bold">Menu</p>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-200 hover:bg-slate-800"
                aria-label="Tutup"
                onClick={() => setMenuOpen(false)}
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </nav>
            <div className="border-t border-slate-700 p-3 text-base text-slate-300">
              <p className="font-semibold text-white">{user.name}</p>
              <p>{user.role_label}</p>
            </div>
          </div>
        </div>
      )}

      {pinOpen && (
        <Modal title="Ganti PIN" onClose={() => setPinOpen(false)}>
          <ChangePinForm isSuperadmin={user.role === "superadmin"} />
        </Modal>
      )}

      {settingsOpen && (
        <Modal
          title={canUsers ? "Pengaturan Super Admin" : "Batas terlambat"}
          onClose={() => setSettingsOpen(false)}
          wide={canUsers}
        >
          <SuperadminPanel
            currentUserId={user.id}
            showUsersTab={canUsers}
          />
        </Modal>
      )}
    </div>
  );
}
