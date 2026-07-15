import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Session } from "@/lib/types";
import { sessionUpdatedAt } from "@/lib/session-meta";

const DB_NAME = "amk-sessions-cache";
const DB_VERSION = 1;
const STORE_NAME = "scopes";

export type SessionCacheScope =
  | `admin:${string}`
  | `tutor:${string}:active`
  | `tutor:${string}:upcoming`
  | `parent:${string}:active`
  | `parent:${string}:upcoming`;

type CachedScope = {
  scope: SessionCacheScope;
  sessions: Session[];
  lastSyncAt: string;
  rangeStart?: string;
  rangeEnd?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "scope" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readScope(scope: SessionCacheScope): Promise<CachedScope | null> {
  try {
    const database = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(scope);
      req.onsuccess = () => resolve((req.result as CachedScope) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function writeScope(entry: CachedScope): Promise<void> {
  try {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore cache write failures
  }
}

/** Remove a session from a cached scope (call after Firestore delete). */
export async function removeSessionFromCache(
  scope: SessionCacheScope,
  sessionId: string
): Promise<void> {
  const cached = await readScope(scope);
  if (!cached) return;
  const sessions = cached.sessions.filter((s) => s.id !== sessionId);
  if (sessions.length === cached.sessions.length) return;
  await writeScope({ ...cached, sessions });
}

/** Remove a session from every cached scope (best-effort). */
export async function removeSessionFromAllCaches(sessionId: string): Promise<void> {
  try {
    const database = await openDb();
    const scopes = await new Promise<CachedScope[]>((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as CachedScope[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    for (const cached of scopes) {
      const sessions = cached.sessions.filter((s) => s.id !== sessionId);
      if (sessions.length !== cached.sessions.length) {
        await writeScope({ ...cached, sessions });
      }
    }
  } catch {
    // ignore
  }
}

function mergeSessions(existing: Session[], incoming: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const s of existing) byId.set(s.id, s);
  for (const s of incoming) byId.set(s.id, s);
  return [...byId.values()].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export type SessionDeltaFilter = {
  tutorId?: string;
  studentIds?: string[];
};

async function fetchUpdatedSince(
  since: string,
  filter?: SessionDeltaFilter
): Promise<Session[]> {
  if (filter?.tutorId) {
    const q = query(
      collection(db, "sessions"),
      where("tutorId", "==", filter.tutorId),
      where("updatedAt", ">", since),
      orderBy("updatedAt")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session));
  }

  if (filter?.studentIds && filter.studentIds.length > 0) {
    const IN_LIMIT = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < filter.studentIds.length; i += IN_LIMIT) {
      chunks.push(filter.studentIds.slice(i, i + IN_LIMIT));
    }
    const byId = new Map<string, Session>();
    for (const chunk of chunks) {
      const q = query(
        collection(db, "sessions"),
        where("studentId", "in", chunk),
        where("updatedAt", ">", since),
        orderBy("updatedAt")
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        byId.set(d.id, { id: d.id, ...d.data() } as Session);
      }
    }
    return [...byId.values()];
  }

  return [];
}

export type SyncSessionsOptions = {
  scope: SessionCacheScope;
  rangeStart: string;
  rangeEnd: string;
  fetchFresh: () => Promise<Session[]>;
  onUpdated?: (sessions: Session[]) => void;
  /** Scope background delta sync to tutor/parent; admin uses fetchFresh instead. */
  deltaFilter?: SessionDeltaFilter;
};

export async function syncSessionsWithCache(
  options: SyncSessionsOptions
): Promise<{ sessions: Session[]; fromCache: boolean }> {
  const cached = await readScope(options.scope);
  const hadCache =
    !!cached &&
    cached.rangeStart === options.rangeStart &&
    cached.rangeEnd === options.rangeEnd;

  if (hadCache && cached) {
    void (async () => {
      try {
        let delta: Session[] = [];
        try {
          if (options.deltaFilter) {
            delta = await fetchUpdatedSince(cached.lastSyncAt, options.deltaFilter);
          } else {
            delta = await options.fetchFresh();
          }
        } catch {
          delta = await options.fetchFresh();
        }
        const inRange = delta.filter((s) => {
          const t = s.startTime;
          return t >= options.rangeStart && t < options.rangeEnd;
        });
        const merged = mergeSessions(cached.sessions, inRange);
        await writeScope({
          scope: options.scope,
          sessions: merged,
          lastSyncAt: new Date().toISOString(),
          rangeStart: options.rangeStart,
          rangeEnd: options.rangeEnd,
        });
        options.onUpdated?.(merged);
      } catch {
        // background sync failed silently
      }
    })();

    return { sessions: cached.sessions, fromCache: true };
  }

  const fresh = await options.fetchFresh();
  await writeScope({
    scope: options.scope,
    sessions: fresh,
    lastSyncAt: new Date().toISOString(),
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
  });
  return { sessions: fresh, fromCache: false };
}

export async function refreshSessionsCache(
  options: SyncSessionsOptions
): Promise<Session[]> {
  const fresh = await options.fetchFresh();
  await writeScope({
    scope: options.scope,
    sessions: fresh,
    lastSyncAt: new Date().toISOString(),
    rangeStart: options.rangeStart,
    rangeEnd: options.rangeEnd,
  });
  return fresh;
}

export { sessionUpdatedAt };
