import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";

const IN_QUERY_LIMIT = 30;

export const UPCOMING_SESSIONS_LIMIT = 25;
export const HISTORY_PAGE_SIZE = 20;

export const ACTIVE_SESSIONS_LOOKBACK_DAYS = 30;
export const ACTIVE_SESSIONS_LOOKAHEAD_DAYS = 90;

export type AdminSessionsViewMode = "today" | "week" | "history" | "date";

export function getActiveSessionsDateRange(): { start: string; end: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - ACTIVE_SESSIONS_LOOKBACK_DAYS);
  const end = new Date(startOfToday);
  end.setDate(end.getDate() + ACTIVE_SESSIONS_LOOKAHEAD_DAYS);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getDayDateRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getSessionsDateRange(
  viewMode: AdminSessionsViewMode,
  options?: {
    historyMonth?: { year: number; month: number };
    pickedDate?: string;
  }
): { start: string; end: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (viewMode === "today") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 1);
    return { start: startOfToday.toISOString(), end: end.toISOString() };
  }

  if (viewMode === "week") {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() + 7);
    return { start: startOfToday.toISOString(), end: end.toISOString() };
  }

  if (viewMode === "date" && options?.pickedDate) {
    return getDayDateRange(options.pickedDate);
  }

  const historyMonth = options?.historyMonth;
  const year = historyMonth?.year ?? now.getFullYear();
  const month = historyMonth?.month ?? now.getMonth();
  return getMonthDateRange(year, month);
}

export function getMonthDateRange(
  year: number,
  month: number
): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Sessions for dashboard charts: current month + previous month. */
export function getDashboardSessionsDateRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Progress/history views: two years back through one year forward. */
export function getStudentHistoryDateRange(): { start: string; end: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startOfToday);
  start.setFullYear(start.getFullYear() - 2);
  const end = new Date(startOfToday);
  end.setFullYear(end.getFullYear() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function mapSessionDocs(
  docs: QueryDocumentSnapshot<DocumentData>[]
): Session[] {
  return docs
    .map((d) => ({ id: d.id, ...d.data() } as Session))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}

function mergeSessionsById(sessions: Session[]): Session[] {
  const byId = new Map<string, Session>();
  for (const s of sessions) byId.set(s.id, s);
  return [...byId.values()].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export type SessionHistoryFilters = {
  studentId?: string;
  tutorId?: string;
  studentIds?: string[];
};

/** Fetch sessions in a date window with optional entity filters. */
export async function fetchSessionsByDateRange(
  start: string,
  end: string,
  filters: SessionHistoryFilters = {}
): Promise<Session[]> {
  const constraints: QueryConstraint[] = [
    where("startTime", ">=", start),
    where("startTime", "<", end),
    orderBy("startTime"),
  ];

  if (filters.studentId) {
    constraints.splice(1, 0, where("studentId", "==", filters.studentId));
  } else if (filters.tutorId) {
    constraints.splice(1, 0, where("tutorId", "==", filters.tutorId));
  }

  const q = query(collection(db, "sessions"), ...constraints);
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);

  let sessions = mapSessionDocs(snap.docs);

  if (filters.studentIds && filters.studentIds.length > 0) {
    const idSet = new Set(filters.studentIds);
    sessions = sessions.filter((s) => idSet.has(s.studentId));
  }

  return sessions;
}

/** Explicit history load (e.g. one calendar month). */
export async function fetchSessionHistory(
  start: string,
  end: string,
  filters: SessionHistoryFilters = {}
): Promise<Session[]> {
  return fetchSessionsByDateRange(start, end, filters);
}

async function fetchSessionsForStudentIdsInRange(
  studentIds: string[],
  start: string,
  end: string
): Promise<Session[]> {
  if (studentIds.length === 0) return [];

  const snapshots = await Promise.all(
    chunk(studentIds, IN_QUERY_LIMIT).map((ids) =>
      getDocs(
        query(
          collection(db, "sessions"),
          where("studentId", "in", ids),
          where("startTime", ">=", start),
          where("startTime", "<", end),
          orderBy("startTime")
        )
      )
    )
  );

  const merged: Session[] = [];
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      merged.push({ id: d.id, ...d.data() } as Session);
    }
  }

  return mergeSessionsById(merged).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

/** Parent portal: active-window sessions for this parent's students. */
export async function fetchSessionsForStudentIds(
  studentIds: string[],
  options?: { start?: string; end?: string }
): Promise<Session[]> {
  const range = options?.start && options?.end
    ? { start: options.start, end: options.end }
    : getActiveSessionsDateRange();
  return fetchSessionsForStudentIdsInRange(studentIds, range.start, range.end);
}

/** Tutor dashboard: active-window sessions for this tutor. */
export async function fetchSessionsForTutor(
  tutorId: string,
  options?: { start?: string; end?: string }
): Promise<Session[]> {
  const range = options?.start && options?.end
    ? { start: options.start, end: options.end }
    : getActiveSessionsDateRange();
  return fetchSessionsByDateRange(range.start, range.end, { tutorId });
}

export async function fetchSessionsForStudent(
  studentId: string,
  options?: { start?: string; end?: string }
): Promise<Session[]> {
  const range = options?.start && options?.end
    ? { start: options.start, end: options.end }
    : getActiveSessionsDateRange();
  return fetchSessionsByDateRange(range.start, range.end, { studentId });
}

export function getUpcomingFromIso(): string {
  return new Date().toISOString();
}

/** Upcoming sessions for a tutor (default dashboard load). */
export async function fetchUpcomingSessionsForTutor(
  tutorId: string,
  limitCount = UPCOMING_SESSIONS_LIMIT
): Promise<Session[]> {
  const now = getUpcomingFromIso();
  const q = query(
    collection(db, "sessions"),
    where("tutorId", "==", tutorId),
    where("startTime", ">=", now),
    orderBy("startTime", "asc"),
    limit(limitCount)
  );
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);
  return mapSessionDocs(snap.docs);
}

/** Paginated past sessions for a tutor (history tab). */
export async function fetchPastSessionsPageForTutor(
  tutorId: string,
  options: { pageSize?: number; beforeStartTime?: string } = {}
): Promise<{ sessions: Session[]; nextCursor: string | null }> {
  const pageSize = options.pageSize ?? HISTORY_PAGE_SIZE;
  const upper = options.beforeStartTime ?? getUpcomingFromIso();
  const q = query(
    collection(db, "sessions"),
    where("tutorId", "==", tutorId),
    where("startTime", "<", upper),
    orderBy("startTime", "desc"),
    limit(pageSize)
  );
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);
  const sessions = mapSessionDocs(snap.docs).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const nextCursor =
    sessions.length === pageSize
      ? sessions[sessions.length - 1].startTime
      : null;
  return { sessions, nextCursor };
}

/** Upcoming sessions for a parent's students. */
export async function fetchUpcomingSessionsForStudentIds(
  studentIds: string[],
  limitCount = UPCOMING_SESSIONS_LIMIT
): Promise<Session[]> {
  if (studentIds.length === 0) return [];
  const now = getUpcomingFromIso();

  const snapshots = await Promise.all(
    chunk(studentIds, IN_QUERY_LIMIT).map((ids) =>
      safeFirestore(() =>
        getDocs(
          query(
            collection(db, "sessions"),
            where("studentId", "in", ids),
            where("startTime", ">=", now),
            orderBy("startTime", "asc"),
            limit(limitCount)
          )
        )
      )
    )
  );

  let readCount = 0;
  const merged: Session[] = [];
  for (const snap of snapshots) {
    readCount += snap.size;
    for (const d of snap.docs) {
      merged.push({ id: d.id, ...d.data() } as Session);
    }
  }
  wrapFirestoreResult(merged, readCount);

  return mergeSessionsById(merged)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, limitCount);
}

/** Paginated past sessions for a parent's students. */
export async function fetchPastSessionsPageForStudentIds(
  studentIds: string[],
  options: { pageSize?: number; beforeStartTime?: string } = {}
): Promise<{ sessions: Session[]; nextCursor: string | null }> {
  if (studentIds.length === 0) return { sessions: [], nextCursor: null };
  const pageSize = options.pageSize ?? HISTORY_PAGE_SIZE;
  const upper = options.beforeStartTime ?? getUpcomingFromIso();

  const snapshots = await Promise.all(
    chunk(studentIds, IN_QUERY_LIMIT).map((ids) =>
      safeFirestore(() =>
        getDocs(
          query(
            collection(db, "sessions"),
            where("studentId", "in", ids),
            where("startTime", "<", upper),
            orderBy("startTime", "desc"),
            limit(pageSize)
          )
        )
      )
    )
  );

  let readCount = 0;
  const merged: Session[] = [];
  for (const snap of snapshots) {
    readCount += snap.size;
    for (const d of snap.docs) {
      merged.push({ id: d.id, ...d.data() } as Session);
    }
  }
  wrapFirestoreResult(merged, readCount);

  const sessions = mergeSessionsById(merged)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, pageSize);
  const nextCursor =
    sessions.length === pageSize ? sessions[sessions.length - 1].startTime : null;
  return { sessions, nextCursor };
}

/** Upcoming sessions for a single student (admin detail). */
export async function fetchUpcomingSessionsForStudent(
  studentId: string,
  limitCount = UPCOMING_SESSIONS_LIMIT
): Promise<Session[]> {
  const now = getUpcomingFromIso();
  const q = query(
    collection(db, "sessions"),
    where("studentId", "==", studentId),
    where("startTime", ">=", now),
    orderBy("startTime", "asc"),
    limit(limitCount)
  );
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);
  return mapSessionDocs(snap.docs);
}

export async function fetchPastSessionsPageForStudent(
  studentId: string,
  options: { pageSize?: number; beforeStartTime?: string } = {}
): Promise<{ sessions: Session[]; nextCursor: string | null }> {
  const pageSize = options.pageSize ?? HISTORY_PAGE_SIZE;
  const upper = options.beforeStartTime ?? getUpcomingFromIso();
  const q = query(
    collection(db, "sessions"),
    where("studentId", "==", studentId),
    where("startTime", "<", upper),
    orderBy("startTime", "desc"),
    limit(pageSize)
  );
  const snap = await safeFirestore(() => getDocs(q));
  wrapFirestoreResult(snap, snap.size);
  const sessions = mapSessionDocs(snap.docs).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  const nextCursor =
    sessions.length === pageSize ? sessions[sessions.length - 1].startTime : null;
  return { sessions, nextCursor };
}
