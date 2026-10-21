import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, #dbeafe 0%, transparent 42%), radial-gradient(circle at 85% 80%, #ccfbf1 0%, transparent 40%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-lg border-2 border-slate-300 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          PT. Indonesia Smelting Technology
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          IST Security
        </h1>
        <p className="mt-2 text-base text-slate-700">
          Masuk dengan ID petugas dan password.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
