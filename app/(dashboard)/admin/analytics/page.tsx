"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DollarSign,
  BookOpen,
  Users,
  TrendingUp,
  Download,
} from "lucide-react";
import { Invoice, PayStub, Session, Student } from "@/lib/types";
import RevenueChart from "@/components/analytics/RevenueChart";
import type { RevenueDataPoint } from "@/components/analytics/RevenueChart";
import SessionVolumeChart from "@/components/analytics/SessionVolumeChart";
import type { SessionVolumePoint } from "@/components/analytics/SessionVolumeChart";
import ConversionFunnelChart from "@/components/analytics/ConversionFunnelChart";
import type { FunnelStage } from "@/components/analytics/ConversionFunnelChart";
import { toast } from "sonner";

type Period = "7d" | "30d" | "90d" | "12m";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payStubs, setPayStubs] = useState<PayStub[]>([]);
  const [evaluations, setEvaluations] = useState<{ convertedToStudent?: boolean }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [invSnap, sessSnap, studSnap, paySnap, evalSnap] = await Promise.all([
          getDocs(collection(db, "invoices")),
          getDocs(collection(db, "sessions")),
          getDocs(collection(db, "students")),
          getDocs(collection(db, "payStubs")),
          getDocs(collection(db, "evaluations")),
        ]);
        setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
        setSessions(sessSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
        setStudents(studSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
        setPayStubs(paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as PayStub)));
        setEvaluations(evalSnap.docs.map((d) => d.data()));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const { start, end } = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    if (period === "7d") startDate.setDate(endDate.getDate() - 7);
    else if (period === "30d") startDate.setDate(endDate.getDate() - 30);
    else if (period === "90d") startDate.setDate(endDate.getDate() - 90);
    else {
      startDate.setFullYear(endDate.getFullYear() - 1);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { start: startDate, end: endDate };
  }, [period]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((inv) => {
        const d = new Date(inv.issueDate);
        return d >= start && d <= end && inv.status === "Paid";
      }),
    [invoices, start, end]
  );
  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => {
        const d = new Date(s.startTime);
        return d >= start && d <= end;
      }),
    [sessions, start, end]
  );
  const completedSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === "Completed"),
    [filteredSessions]
  );

  const revenueTrendData: RevenueDataPoint[] = useMemo(() => {
    const points: RevenueDataPoint[] = [];
    const step = period === "12m" ? "month" : "day";
    let cursor = new Date(start);
    while (cursor <= end) {
      const periodEnd = new Date(cursor);
      if (step === "month") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setDate(periodEnd.getDate() + 1);
      const rev = invoices
        .filter((inv) => {
          const d = new Date(inv.issueDate);
          return inv.status === "Paid" && d >= cursor && d < periodEnd;
        })
        .reduce((s, inv) => s + inv.totalAmount, 0);
      const sessCount = sessions.filter((s) => {
        const d = new Date(s.startTime);
        return d >= cursor && d < periodEnd;
      }).length;
      points.push({
        period: cursor.toLocaleDateString("en-US", step === "month" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }),
        revenue: Math.round(rev * 100) / 100,
        sessions: sessCount,
      });
      if (step === "month") cursor.setMonth(cursor.getMonth() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
    return points;
  }, [invoices, sessions, start, end, period]);

  const sessionVolumeData: SessionVolumePoint[] = useMemo(() => {
    if (period === "12m") {
      const byMonth: Record<string, number> = {};
      let cursor = new Date(start);
      while (cursor <= end) {
        const key = cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        byMonth[key] = 0;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      filteredSessions.forEach((s) => {
        const d = new Date(s.startTime);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (byMonth[key] !== undefined) byMonth[key]++;
      });
      return Object.entries(byMonth).map(([label, sessions]) => ({ label, sessions }));
    }
    const days = Math.min(14, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
    const dayLabels: SessionVolumePoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = filteredSessions.filter((s) => {
        const t = new Date(s.startTime);
        return t >= d && t < next;
      }).length;
      dayLabels.push({
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sessions: count,
      });
    }
    return dayLabels;
  }, [filteredSessions, start, end, period]);

  const tutorPerformance = useMemo(() => {
    const byTutor: Record<string, { name: string; sessions: number; completed: number }> = {};
    filteredSessions.forEach((s) => {
      const id = s.tutorId;
      if (!byTutor[id]) byTutor[id] = { name: s.tutorName, sessions: 0, completed: 0 };
      byTutor[id].sessions++;
      if (s.status === "Completed") byTutor[id].completed++;
    });
    return Object.entries(byTutor)
      .map(([id, v]) => ({ tutorId: id, ...v }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  }, [filteredSessions]);

  const conversionFunnelData: FunnelStage[] = useMemo(() => {
    const totalEvals = evaluations.length;
    const converted = evaluations.filter((e) => e.convertedToStudent === true).length;
    const activeStudents = students.filter((s) => s.status === "Active").length;
    return [
      { stage: "Evaluations", count: totalEvals },
      { stage: "Converted to Student", count: converted },
      { stage: "Active Students", count: activeStudents },
    ];
  }, [evaluations, students]);

  const totalRevenue = filteredInvoices.reduce((s, inv) => s + inv.totalAmount, 0);
  const avgSessionValue = completedSessions.length ? totalRevenue / completedSessions.length : 0;
  const retentionCount = students.filter((s) => s.status === "Active").length;

  const exportCSV = () => {
    const rows: string[][] = [
      ["Period", "Revenue", "Sessions", "Completed"],
      ...revenueTrendData.map((r) => [r.period, String(r.revenue), String(r.sessions ?? 0), ""]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div className="p-8 flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold font-heading">Analytics</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {(["7d", "30d", "90d", "12m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {p === "12m" ? "12 months" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
              </button>
            ))}
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
              <DollarSign size={18} />
              Revenue (period)
            </div>
            <p className="text-xl font-bold text-gray-900">
              ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
              <BookOpen size={18} />
              Sessions
            </div>
            <p className="text-xl font-bold text-gray-900">{filteredSessions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">{completedSessions.length} completed</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
              <Users size={18} />
              Active students
            </div>
            <p className="text-xl font-bold text-gray-900">{retentionCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1">
              <TrendingUp size={18} />
              Avg session value
            </div>
            <p className="text-xl font-bold text-gray-900">
              ${avgSessionValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Revenue trend</h2>
            <RevenueChart data={revenueTrendData} />
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Session volume</h2>
            <SessionVolumeChart data={sessionVolumeData} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Conversion funnel</h2>
            <ConversionFunnelChart data={conversionFunnelData} />
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4">Tutor performance (top 10)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="pb-2 pr-2">Tutor</th>
                    <th className="pb-2 pr-2 text-right">Sessions</th>
                    <th className="pb-2 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {tutorPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-gray-500">
                        No session data in this period
                      </td>
                    </tr>
                  ) : (
                    tutorPerformance.map((t) => (
                      <tr key={t.tutorId} className="border-b border-gray-100">
                        <td className="py-2 pr-2 font-medium text-gray-900">{t.name}</td>
                        <td className="py-2 pr-2 text-right">{t.sessions}</td>
                        <td className="py-2 text-right">{t.completed}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
