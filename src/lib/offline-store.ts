/**
 * Layer A/B (client): cache + antrian sync offline → POST /api/sync → D1.
 * MVP: localStorage; schema payload selaras tabel D1.
 */

export type SyncEntity = "borrow_log" | "key_hold";

export type SyncQueueItem = {
  id: string;
  entity: SyncEntity;
  op: "upsert";
  payload: Record<string, unknown>;
  createdAt: string;
};

const QUEUE_KEY = "ist-security:sync-queue";
const HOLD_KEY = "ist-security:key-holds";
const CLIENT_ID_KEY = "ist-security:client-id";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getClientId(): string {
  if (!canUseStorage()) return "server";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function readSyncQueue(): SyncQueueItem[] {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as SyncQueueItem[];
  } catch {
    return [];
  }
}

export function enqueueSync(
  entity: SyncEntity,
  payload: Record<string, unknown>
): SyncQueueItem {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    entity,
    op: "upsert",
    payload,
    createdAt: new Date().toISOString(),
  };
  const q = readSyncQueue();
  q.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  return item;
}

export function clearSynced(ids: string[]) {
  if (!canUseStorage() || ids.length === 0) return;
  const set = new Set(ids);
  const next = readSyncQueue().filter((i) => !set.has(i.id));
  localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
}

/** Layer A: key yang sedang di-hold di perangkat */
export function setKeyHold(code: string, meta: Record<string, unknown>) {
  if (!canUseStorage()) return;
  const holds = JSON.parse(localStorage.getItem(HOLD_KEY) ?? "{}") as Record<
    string,
    unknown
  >;
  holds[code] = { ...meta, heldAt: new Date().toISOString() };
  localStorage.setItem(HOLD_KEY, JSON.stringify(holds));
}

export async function flushSyncQueue(): Promise<{
  ok: boolean;
  applied: number;
  error?: string;
}> {
  const items = readSyncQueue();
  if (items.length === 0) return { ok: true, applied: 0 };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clientId: getClientId(), items }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      data?: { appliedIds?: string[] };
      error?: string;
    };
    if (!json.ok) return { ok: false, applied: 0, error: json.error };
    clearSynced(json.data?.appliedIds ?? []);
    return { ok: true, applied: json.data?.appliedIds?.length ?? 0 };
  } catch (e) {
    return {
      ok: false,
      applied: 0,
      error: e instanceof Error ? e.message : "sync gagal",
    };
  }
}
