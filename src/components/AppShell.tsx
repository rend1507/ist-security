"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { ChangePinForm } from "@/components/ChangePinForm";
import { HeaderClock } from "@/components/HeaderClock";
import {
  IconChart,
  IconDatabase,
  IconKey,
  IconList,
  IconLock,
  IconSettings,
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
  pillActive,
  pillActiveDark,
  pillIdle,
  pillIdleDark,
  toolbarGroup,
} from "@/lib/ui";

type NavKey = "dashboard" | "keys" | "logs" | "master";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
  active?: NavKey;
  user: SessionUser;
};

const NAV_ICONS: Record<NavKey, React.ReactNode> = {
  dashboard: <IconChart />,
  keys: <IconKey />,
  logs: <IconList />,
  master: <IconDatabase />,
};

export function AppShell({ title, children, active, user }: AppShellProps) {
  const [pinOpen, setPinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canUsers = canManageUsers(user.role);
  const canOverdue = canSetOverdue(user.role);
  const showSettings = canUsers || canOverdue;

  const nav: { href: string; label: string; key: NavKey }[] = [
    { href: "/dashboard", label: "Ringkasan", key: "dashboard" },
    { href: "/keys", label: "Buku kunci", key: "keys" },
    { href: "/log-kunci", label: "Log kunci", key: "logs" },
  ];
  if (canManageMaster(user.role)) {
    nav.push({ href: "/admin/master", label: "Data Master", key: "master" });
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 text-slate-100 md:flex">
          <div className="border-b border-slate-700 px-4 py-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              PT Indonesia Smelting Technology
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight">IST Security</p>
          </div>
          <nav className="flex flex-1 flex-col gap-3 p-3">
            <div className="rounded-lg bg-slate-800/80 p-2">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Menu
              </p>
              <div className="flex flex-col gap-1.5">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
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
                <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Akun
                </p>
                <div className="flex flex-col gap-1.5">
                  {canChangeOwnPin(user.role) && (
                    <button
                      type="button"
                      onClick={() => setPinOpen(true)}
                      className={pillIdleDark}
                    >
                      <IconLock />
                      Ganti PIN
                    </button>
                  )}
                  {showSettings && (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className={pillIdleDark}
                    >
                      <IconSettings />
                      Pengaturan
                    </button>
                  )}
                </div>
              </div>
            )}
          </nav>
          <div className="border-t border-slate-700 p-3 text-sm text-slate-300">
            <p className="font-semibold text-white">{user.name}</p>
            <p>{user.role_label}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b-2 border-slate-300 bg-white px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 md:px-6">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
                {title}
              </h1>
              <p className="text-sm text-slate-600 md:hidden">
                {user.name} · {user.role_label}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
              <HeaderClock />
              <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-3 sm:gap-3 sm:pl-4">
                <span className="hidden font-mono text-sm font-semibold text-slate-700 sm:inline">
                  {user.username}
                </span>
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="border-b-2 border-slate-300 bg-white px-3 py-2.5 md:hidden">
            <div className={`${toolbarGroup} !gap-1.5`}>
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    (active === item.key ? pillActive : pillIdle) +
                    " flex-1 justify-center sm:flex-none"
                  }
                >
                  {NAV_ICONS[item.key]}
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
              {canChangeOwnPin(user.role) && (
                <button
                  type="button"
                  onClick={() => setPinOpen(true)}
                  className={`${pillIdle} flex-1 justify-center sm:flex-none`}
                >
                  <IconLock />
                  <span className="truncate">PIN</span>
                </button>
              )}
              {showSettings && (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className={`${pillIdle} flex-1 justify-center sm:flex-none`}
                >
                  <IconSettings />
                  <span className="truncate">Atur</span>
                </button>
              )}
            </div>
          </div>

          <main className="flex-1 px-3 py-4 text-base sm:px-4 sm:py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>

      {pinOpen && (
        <Modal title="Ganti PIN" onClose={() => setPinOpen(false)}>
          <p className="mb-3 text-base text-slate-700">
            Ganti PIN 6 angka Anda. PIN dipakai saat pinjam / kembalikan / ubah
            jam.
          </p>
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
