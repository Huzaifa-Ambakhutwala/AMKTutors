import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";

const IN_QUERY_LIMIT = 30;

export type AdminSessionsViewMode = "today" | "week" | "all";

export function getSessionsDateRange(viewMode: AdminSessionsViewMode): {
  start: string;
  end: string;
} {
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

/** Admin list: only sessions in the selected date window (not the full collection). */
export async function fetchSessionsByDateRange(
  start: string,
  end: string
): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("startTime", ">=", start),
    where("startTime", "<", end),
    orderBy("startTime")
  );
  const snap = await getDocs(q);
  return mapSessionDocs(snap.docs);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Parent portal: only sessions for this parent's students. */
export async function fetchSessionsForStudentIds(
  studentIds: string[]
): Promise<Session[]> {
  if (studentIds.length === 0) return [];

  const snapshots = await Promise.all(
    chunk(studentIds, IN_QUERY_LIMIT).map((ids) =>
      getDocs(query(collection(db, "sessions"), where("studentId", "in", ids)))
    )
  );

  const byId = new Map<string, Session>();
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      byId.set(d.id, { id: d.id, ...d.data() } as Session);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

/** Tutor dashboard: only sessions assigned to this tutor. */
export async function fetchSessionsForTutor(tutorId: string): Promise<Session[]> {
  const snap = await getDocs(
    query(collection(db, "sessions"), where("tutorId", "==", tutorId))
  );
  return mapSessionDocs(snap.docs);
}
