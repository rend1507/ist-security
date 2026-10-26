import { cookies } from "next/headers";
import { getDb, getEnv, jsonErr } from "@/lib/db";
import { ROLE_LABELS, canLogin, type Role } from "@/lib/roles";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  resolveSessionSecret,
} from "@/lib/security";

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: Role;
  role_label: string;
  email: string | null;
};

type Payload = { uid: number; role: string; exp: number };

const COOKIE = SESSION_COOKIE;
const MAX_AGE = SESSION_MAX_AGE_SEC;

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data);
  else bytes = data;
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): ArrayBuffer {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(uid: number, role: string, secret: string) {
  const body: Payload = {
    uid,
    role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const data = b64url(JSON.stringify(body));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return `${data}.${b64url(sig)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<Payload | null> {
  if (!token?.includes(".")) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    fromB64url(sig),
    new TextEncoder().encode(data)
  );
  if (!ok) return null;
  try {
    const json = JSON.parse(
      new TextDecoder().decode(fromB64url(data))
    ) as Payload;
    if (!json.exp || json.exp < Math.floor(Date.now() / 1000)) return null;
    return json;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    // Production/Workers selalu HTTPS; local `next dev` boleh non-secure.
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionSecret(): Promise<string> {
  const env = await getEnv();
  return resolveSessionSecret(env.SESSION_SECRET);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  let secret: string;
  try {
    secret = await getSessionSecret();
  } catch {
    return null;
  }
  const session = await verifySession(token, secret);
  if (!session) return null;

  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT id, username, name, role, email FROM users
       WHERE id = ? AND deleted_at IS NULL`
    )
    .bind(session.uid)
    .first<{
      id: number;
      username: string;
      name: string;
      role: string;
      email: string | null;
    }>();

  if (!row || !canLogin(row.role)) return null;
  return {
    id: Number(row.id),
    username: row.username,
    name: row.name,
    role: row.role as Role,
    role_label: ROLE_LABELS[row.role as Role] || row.role,
    email: row.email,
  };
}

export async function requireUser(): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) return jsonErr("Silakan masuk dulu.", 401);
  return user;
}
