import { doc, setDoc, increment, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Session } from "@/lib/types";

export interface MonthlyStatsDoc {
  sessionCount: number;
  completedCount: number;
  cancelledCount: number;
  updatedAt: string;
}

export function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

export function monthKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    keys.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

/** Best-effort update of monthly session aggregates (small writes, no full scans). */
export async function touchMonthlySessionStats(
  session: Pick<Session, "startTime" | "status">,
  event: "create" | "update" | "delete",
  previous?: Pick<Session, "status" | "startTime"> | null
): Promise<void> {
  try {
    const monthKey = monthKeyFromIso(session.startTime);
    const ref = doc(db, "monthlyStats", monthKey);
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = { updatedAt: now };

    if (event === "create") {
      patch.sessionCount = increment(1);
      if (session.status === "Completed") patch.completedCount = increment(1);
      if (session.status === "Cancelled") patch.cancelledCount = increment(1);
    } else if (event === "delete") {
      patch.sessionCount = increment(-1);
      if (session.status === "Completed") patch.completedCount = increment(-1);
      if (session.status === "Cancelled") patch.cancelledCount = increment(-1);
    } else if (event === "update" && previous) {
      if (previous.status !== session.status) {
        if (session.status === "Completed") patch.completedCount = increment(1);
        if (previous.status === "Completed") patch.completedCount = increment(-1);
        if (session.status === "Cancelled") patch.cancelledCount = increment(1);
        if (previous.status === "Cancelled") patch.cancelledCount = increment(-1);
      }
      if (monthKeyFromIso(previous.startTime) !== monthKey) {
        await setDoc(
          doc(db, "monthlyStats", monthKeyFromIso(previous.startTime)),
          {
            sessionCount: increment(-1),
            ...(previous.status === "Completed"
              ? { completedCount: increment(-1) }
              : {}),
            ...(previous.status === "Cancelled"
              ? { cancelledCount: increment(-1) }
              : {}),
            updatedAt: now,
          },
          { merge: true }
        );
        patch.sessionCount = increment(1);
        if (session.status === "Completed") patch.completedCount = increment(1);
        if (session.status === "Cancelled") patch.cancelledCount = increment(1);
      }
    }

    await setDoc(ref, patch, { merge: true });
  } catch (e) {
    console.warn("Monthly stats update skipped:", e);
  }
}

export async function fetchMonthlyStats(
  monthKeys: string[]
): Promise<Record<string, MonthlyStatsDoc>> {
  const out: Record<string, MonthlyStatsDoc> = {};
  await Promise.all(
    monthKeys.map(async (key) => {
      const snap = await getDoc(doc(db, "monthlyStats", key));
      if (snap.exists()) {
        out[key] = snap.data() as MonthlyStatsDoc;
      }
    })
  );
  return out;
}
