import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";

const IN_QUERY_LIMIT = 30;

export const ACTIVE_SESSIONS_LOOKBACK_DAYS = 30;
export const ACTIVE_SESSIONS_LOOKAHEAD_DAYS = 90;

export type AdminSessionsViewMode = "today" | "week" | "history";

export function getActiveSessionsDateRange(): { start: string; end: string } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(startOfToday);
  start.setDate(start.getDate() - ACTIVE_SESSIONS_LOOKBACK_DAYS);
  const end = new Date(startOfToday);
  end.setDate(end.getDate() + ACTIVE_SESSIONS_LOOKAHEAD_DAYS);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getSessionsDateRange(
  viewMode: AdminSessionsViewMode,
  historyMonth?: { year: number; month: number }
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
  const snap = await getDocs(q);

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
