"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  DEMO_PIN,
} from "@/lib/roles";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Gagal masuk.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung. Cek jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-slate-300">
          ID petugas
          <input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="contoh: sec01"
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-white outline-none ring-blue-600 focus:ring-2"
            required
          />
        </label>
        <label className="block text-sm text-slate-300">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password akun"
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none ring-blue-600 focus:ring-2"
            required
          />
        </label>
        {error && (
          <p className="rounded-md bg-rose-950/80 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Memeriksa…" : "Masuk"}
        </button>
      </form>

      <div className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-3 text-xs text-slate-400">
        <p className="font-medium text-slate-300">Akun uji (demo)</p>
        <ul className="mt-2 space-y-1 font-mono">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="text-left text-slate-300 hover:text-white hover:underline"
                onClick={() => {
                  setUsername(a.id);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                {a.id}
              </button>
              <span className="text-slate-500"> — {a.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-slate-400">
          Password default:{" "}
          <span className="font-mono text-slate-200">{DEMO_PASSWORD}</span>
        </p>
        <p className="mt-1 text-slate-400">
          PIN default (transaksi):{" "}
          <span className="font-mono text-slate-200">{DEMO_PIN}</span>
        </p>
      </div>
    </div>
  );
}
