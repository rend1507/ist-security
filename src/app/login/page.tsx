import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #1e3a8a 0%, transparent 45%), radial-gradient(circle at 80% 70%, #0f766e 0%, transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-lg border border-slate-700 bg-slate-950/80 p-8 shadow-xl backdrop-blur">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          PT. Indonesia Smelting Technology
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          IST Security
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Masuk dengan ID petugas dan password.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
