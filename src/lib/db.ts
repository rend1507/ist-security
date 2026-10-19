import { getCloudflareContext } from "@opennextjs/cloudflare";

export type CloudflareEnv = {
  DB: D1Database;
  SESSION_SECRET?: string;
  APP_NAME?: string;
  DEFAULT_OVERDUE_MINUTES?: string;
};

export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as CloudflareEnv;
}

export async function getDb(): Promise<D1Database> {
  const env = await getEnv();
  if (!env.DB) {
    throw new Error(
      "D1 binding DB tidak tersedia. Jalankan npm run db:migrate:local lalu npm run preview/dev."
    );
  }
  return env.DB;
}

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status });
}

export function jsonErr(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}
