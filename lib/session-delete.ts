import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { syncSessionToCalendar } from "@/lib/calendar-sync-client";
import { removeSessionFromAllCaches } from "@/lib/sessions-cache";
import { touchMonthlySessionStats } from "@/lib/stats-monthly";
import type { Session } from "@/lib/types";
import { safeFirestore } from "@/lib/firestore-safe";

export async function deleteOneSession(
  session: Pick<Session, "id" | "startTime" | "status">
): Promise<void> {
  await syncSessionToCalendar(session.id, "delete");
  await deleteDoc(doc(db, "sessions", session.id));
  void removeSessionFromAllCaches(session.id);
  void touchMonthlySessionStats(
    { startTime: session.startTime, status: session.status },
    "delete"
  );
}

export async function fetchSessionsInSeries(seriesId: string): Promise<Session[]> {
  const q = query(
    collection(db, "sessions"),
    where("recurringSeriesId", "==", seriesId)
  );
  const snap = await safeFirestore(() => getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Session);
}

export async function deleteRecurringSeries(seriesId: string): Promise<number> {
  const sessions = await fetchSessionsInSeries(seriesId);
  for (const session of sessions) {
    await deleteOneSession(session);
  }
  return sessions.length;
}
