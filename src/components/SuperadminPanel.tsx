"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  type Role,
} from "@/lib/roles";
import { btnDanger, btnNeutral, btnPrimary, pillActive, pillIdle } from "@/lib/ui";

type UserRow = {
  id: number;
  username: string;
  name: string;
  role: string;
  role_label: string;
};

export function SuperadminPanel({
  currentUserId,
  showUsersTab = true,
}: {
  currentUserId: number;
  /** false = hanya batas terlambat (Admin); true = + akun petugas (Super Admin) */
  showUsersTab?: boolean;
}) {
  const [tab, setTab] = useState<"overdue" | "users">("overdue");
  const [minutes, setMinutes] = useState("5");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [uUser, setUUser] = useState("");
  const [uName, setUName] = useState("");
  const [uRole, setURole] = useState<Role>("security");
  const [uPass, setUPass] = useState("");
  const [uPin, setUPin] = useState("123456");

  const activeTab = showUsersTab ? tab : "overdue";

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await fetch("/api/settings");
      const sj = (await s.json()) as {
        ok: boolean;
        data?: { default_overdue_minutes: number };
      };
      if (sj.ok && sj.data) {
        setMinutes(String(sj.data.default_overdue_minutes));
      }
      if (showUsersTab && activeTab === "users") {
        const res = await fetch("/api/users");
        const json = (await res.json()) as {
          ok: boolean;
          data?: UserRow[];
          error?: string;
        };
        if (!json.ok) throw new Error(json.error || "Gagal memuat akun");
        setUsers(json.data ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    }
  }, [activeTab, showUsersTab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveOverdue() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_overdue_minutes: Number(minutes),
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menyimpan");
        return;
      }
      setMsg("Batas terlambat disimpan. Memuat ulang…");
      window.setTimeout(() => {
        window.location.reload();
      }, 400);
    } finally {
      setLoading(false);
    }
  }

  async function addUser() {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: uUser,
          name: uName,
          role: uRole,
          password: uPass,
          pin: uPin,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menambah akun");
        return;
      }
      setMsg("Akun petugas ditambahkan.");
      setUUser("");
      setUName("");
      setUPass("");
      setUPin("123456");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(id: number) {
    if (!window.confirm("Nonaktifkan akun ini?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deactivate: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal menonaktifkan");
        return;
      }
      setMsg("Akun dinonaktifkan.");
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {showUsersTab && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 bg-slate-100 p-2">
          <button
            type="button"
            onClick={() => setTab("overdue")}
            className={activeTab === "overdue" ? pillActive : pillIdle}
          >
            Batas terlambat
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className={activeTab === "users" ? pillActive : pillIdle}
          >
            Akun petugas
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md border-2 border-rose-300 bg-rose-50 px-3 py-2 text-base text-rose-900">
          {error}
        </p>
      )}
      {msg && (
        <p className="rounded-md border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-base text-emerald-950">
          {msg}
        </p>
      )}

      {activeTab === "overdue" ? (
        <div className="space-y-3">
          <p className="text-base text-slate-700">
            Menit default sebelum status jadi terlambat.
          </p>
          <label className="block text-base font-semibold">
            Menit
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2.5 font-mono text-base"
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={saveOverdue}
            className={btnPrimary}
          >
            Simpan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="list-inside list-disc space-y-1 text-base text-amber-950">
            <li>Tidak bisa menambah Super Admin lewat aplikasi</li>
            <li>Tidak bisa menonaktifkan akun Super Admin (termasuk sendiri)</li>
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-base font-semibold">
              ID
              <input
                value={uUser}
                onChange={(e) => setUUser(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 font-mono text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              Nama
              <input
                value={uName}
                onChange={(e) => setUName(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              Peran
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as Role)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-base font-semibold">
              Password awal
              <input
                type="password"
                value={uPass}
                onChange={(e) => setUPass(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 text-base"
              />
            </label>
            <label className="block text-base font-semibold">
              PIN awal (6 angka)
              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                value={uPin}
                onChange={(e) =>
                  setUPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-1 w-full rounded-md border-2 border-slate-400 px-3 py-2 font-mono text-base tracking-widest"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={addUser}
            className={btnNeutral}
          >
            Tambah akun
          </button>

          <div className="overflow-x-auto rounded-md border-2 border-slate-300">
            <table className="min-w-full text-left text-base">
              <thead className="bg-slate-200 text-sm font-bold uppercase text-slate-800">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Peran</th>
                  <th className="px-3 py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const locked =
                    u.role === "superadmin" || u.id === currentUserId;
                  return (
                    <tr key={u.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono">{u.username}</td>
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">{u.role_label}</td>
                      <td className="px-3 py-2">
                        {locked ? (
                          <span className="text-sm text-slate-500">—</span>
                        ) : (
                          <button
                            type="button"
                            className={`${btnDanger} !px-3 !py-1.5 text-sm`}
                            onClick={() => deactivate(u.id)}
                          >
                            Nonaktifkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
