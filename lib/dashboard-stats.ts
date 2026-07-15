import {
  collection,
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchSessionsByDateRange } from "@/lib/sessions-query";
import { fetchMonthlyStats, monthKeyFromIso } from "@/lib/stats-monthly";
import { safeFirestore } from "@/lib/firestore-safe";
import { wrapFirestoreResult } from "@/lib/firestore-debug";

export type DashboardSummary = {
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  totalSessions: number;
  totalSessionsChange: number;
  activeStudents: number;
  activeStudentsChange: number;
  conversionRate: number;
  conversionRateChange: number;
  weeklySessions: { day: string; sessions: number }[];
};

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const currentMonthKey = monthKeyFromIso(now.toISOString());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKeyFromIso(lastMonthDate.toISOString());
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const [
    monthlyStats,
    activeStudentsSnap,
    evalTotalSnap,
    evalConvertedSnap,
    weekSessions,
    currentMonthPaidSnap,
    lastMonthPaidSnap,
  ] = await Promise.all([
    fetchMonthlyStats([currentMonthKey, lastMonthKey]),
    safeFirestore(() =>
      getCountFromServer(
        query(collection(db, "students"), where("status", "==", "Active"))
      )
    ),
    safeFirestore(() => getCountFromServer(collection(db, "evaluations"))),
    safeFirestore(() =>
      getCountFromServer(
        query(collection(db, "evaluations"), where("convertedToStudent", "==", true))
      )
    ),
    fetchSessionsByDateRange(monday.toISOString(), now.toISOString()),
    safeFirestore(() =>
      getDocs(
        query(
          collection(db, "invoices"),
          where("status", "==", "Paid"),
          where("issueDate", ">=", currentMonthStart.toISOString()),
          orderBy("issueDate", "desc"),
          limit(50)
        )
      )
    ).catch(() =>
      safeFirestore(() =>
        getDocs(
          query(
            collection(db, "invoices"),
            where("status", "==", "Paid"),
            limit(50)
          )
        )
      )
    ),
    safeFirestore(() =>
      getDocs(
        query(
          collection(db, "invoices"),
          where("status", "==", "Paid"),
          where("issueDate", ">=", lastMonthStart.toISOString()),
          where("issueDate", "<=", lastMonthEnd.toISOString()),
          orderBy("issueDate", "desc"),
          limit(50)
        )
      )
    ).catch(async () =>
      safeFirestore(() =>
        getDocs(
          query(
            collection(db, "invoices"),
            where("status", "==", "Paid"),
            limit(50)
          )
        )
      )
    ),
  ]);

  wrapFirestoreResult(null, 4 + currentMonthPaidSnap.size + lastMonthPaidSnap.size);

  const activeStudents = activeStudentsSnap.data().count;
  const totalEvaluations = evalTotalSnap.data().count;
  const convertedEvaluations = evalConvertedSnap.data().count;

  const currentMonthRevenue = currentMonthPaidSnap.docs
    .map((d) => d.data())
    .filter((inv) => new Date(inv.issueDate) >= currentMonthStart)
    .reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);

  const lastMonthRevenue = lastMonthPaidSnap.docs.reduce(
    (sum, inv) => sum + (inv.data().totalAmount ?? 0),
    0
  );

  const revenueChange =
    lastMonthRevenue > 0
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

  const currentMonthSessionCount =
    monthlyStats[currentMonthKey]?.sessionCount ?? 0;
  const lastMonthSessionCount = monthlyStats[lastMonthKey]?.sessionCount ?? 0;
  const sessionsChange =
    lastMonthSessionCount > 0
      ? ((currentMonthSessionCount - lastMonthSessionCount) / lastMonthSessionCount) * 100
      : 0;

  const conversionRate =
    totalEvaluations > 0 ? (convertedEvaluations / totalEvaluations) * 100 : 0;

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyData = weekDays.map((day) => ({ day, sessions: 0 }));
  weekSessions.forEach((session) => {
    const sessionDate = new Date(session.startTime);
    if (sessionDate >= monday && sessionDate <= now) {
      const dayIndex = sessionDate.getDay();
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      if (adjustedIndex >= 0 && adjustedIndex < 7) {
        weeklyData[adjustedIndex].sessions += 1;
      }
    }
  });

  return {
    monthlyRevenue: currentMonthRevenue,
    monthlyRevenueChange: revenueChange,
    totalSessions: currentMonthSessionCount,
    totalSessionsChange: sessionsChange,
    activeStudents,
    activeStudentsChange: 0,
    conversionRate,
    conversionRateChange: 0,
    weeklySessions: weeklyData,
  };
}
