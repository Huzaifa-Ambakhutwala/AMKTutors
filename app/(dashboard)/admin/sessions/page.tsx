"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import {
  fetchSessionsByDateRange,
  getSessionsDateRange,
  type AdminSessionsViewMode,
} from "@/lib/sessions-query";
import {
  syncSessionsWithCache,
  refreshSessionsCache,
  type SessionCacheScope,
} from "@/lib/sessions-cache";
import { touchMonthlySessionStats } from "@/lib/stats-monthly";
import { Loader2, Calendar, Clock, RotateCcw, Edit, Trash2, Eye, Plus, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import FloatingActionButton from "@/components/FloatingActionButton";
import { syncSessionToCalendar } from "@/lib/calendar-sync-client";
import { toast } from "sonner";
import SearchFilterBar from "@/components/SearchFilterBar";

type ViewMode = AdminSessionsViewMode;

function groupSessionsByDate(sessions: Session[]): { date: string; label: string; isToday: boolean; sessions: Session[] }[] {
    const map = new Map<string, Session[]>();
    sessions.forEach(s => {
        const d = new Date(s.startTime);
        const key = d.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    const todayStr = new Date().toDateString();
    return sorted.map(([date, sess]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
        isToday: date === todayStr,
        sessions: sess.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    }));
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function statusClass(s: Session) {
    if (s.status === "Completed") return "bg-green-100 text-green-700 border-green-200";
    if (s.status === "Cancelled") return "bg-red-100 text-red-700 border-red-200";
    if (s.status === "NoShow") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-[#1A2742]/10 text-primary border-[#1A2742]/20";
}

export default function SessionsListPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("today");
    const [historyMonth, setHistoryMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<Session["status"] | "">("");
    const [refreshing, setRefreshing] = useState(false);
    const todaySectionRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const bySearch = searchTerm.trim()
        ? sessions.filter(
            s =>
                s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.tutorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.subject?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : sessions;
    const filteredSessions = statusFilter
        ? bySearch.filter(s => s.status === statusFilter)
        : bySearch;
    const grouped = groupSessionsByDate(filteredSessions);

    const goToToday = () => {
        setViewMode("today");
        todaySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this session?")) return;
        const session = sessions.find((s) => s.id === id);
        try {
            await syncSessionToCalendar(id, "delete");
            await deleteDoc(doc(db, "sessions", id));
            if (session) {
                void touchMonthlySessionStats(
                    { startTime: session.startTime, status: session.status },
                    "delete"
                );
            }
            setSessions(sessions.filter(s => s.id !== id));
        } catch (e) {
            console.error(e);
            toast.error("Error deleting session");
        }
    };

    const loadSessions = useCallback(async (mode: ViewMode, showFullLoader = true, forceRefresh = false) => {
        if (showFullLoader) setLoading(true);
        else setRefreshing(true);
        try {
            const { start, end } = getSessionsDateRange(
                mode,
                mode === "history" ? historyMonth : undefined
            );
            const scope: SessionCacheScope =
                mode === "history"
                    ? `admin:history:${historyMonth.year}-${historyMonth.month}`
                    : `admin:${mode}`;
            const cacheOptions = {
                scope,
                rangeStart: start,
                rangeEnd: end,
                fetchFresh: () => fetchSessionsByDateRange(start, end),
                onUpdated: (merged: Session[]) => setSessions(merged),
            };
            const data = forceRefresh
                ? await refreshSessionsCache(cacheOptions)
                : (await syncSessionsWithCache(cacheOptions)).sessions;
            setSessions(data);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [historyMonth]);

    useEffect(() => {
        loadSessions(viewMode);
    }, [viewMode, historyMonth, loadSessions]);

    const handleRefresh = () => {
        loadSessions(viewMode, false, true);
    };

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold font-heading">Sessions</h1>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loading || refreshing}
                            className="p-2.5 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors disabled:opacity-50"
                            title="Refresh sessions"
                        >
                            <RotateCcw size={20} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                    <Link
                        href="/admin/sessions/new"
                        className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
                    >
                        <Plus size={20} /> Schedule Session
                    </Link>
                </div>

                {/* Search and filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 min-w-0">
                        <SearchFilterBar
                            placeholder="Search by student, tutor, or subject..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as Session["status"] | "")}
                            className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white min-h-[44px]"
                        >
                            <option value="">All</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="NoShow">No Show</option>
                        </select>
                    </div>
                </div>
                {/* Day-based view: Today | This week | All */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 mr-1 flex items-center gap-1">
                        <CalendarDays size={16} /> View:
                    </span>
                    {(["today", "week", "history"] as ViewMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                                viewMode === mode
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {mode === "today" ? "Today" : mode === "week" ? "This week" : "History"}
                        </button>
                    ))}
                    {viewMode === "history" && (
                        <input
                            type="month"
                            value={`${historyMonth.year}-${String(historyMonth.month + 1).padStart(2, "0")}`}
                            onChange={(e) => {
                                const [y, m] = e.target.value.split("-").map(Number);
                                if (y && m) setHistoryMonth({ year: y, month: m - 1 });
                            }}
                            className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white min-h-[44px]"
                        />
                    )}
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors min-h-[44px]"
                    >
                        Go to today
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : isMobile ? (
                <div className="space-y-6 pb-24">
                    {grouped.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">
                                {viewMode === "today" ? "No sessions today." : viewMode === "week" ? "No sessions this week." : "No sessions in this month."}
                            </p>
                        </div>
                    ) : (
                        grouped.map(({ date, label, isToday, sessions: daySessions }) => (
                            <div key={date} ref={isToday ? todaySectionRef : undefined}>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <Calendar size={16} /> {label}
                                    {isToday && <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">Today</span>}
                                </h2>
                                <div className="space-y-3">
                                    {daySessions.map(s => (
                                        <div
                                            key={s.id}
                                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Clock size={16} />
                                                    <span>
                                                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                                                    </span>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass(s)}`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-900">{s.studentName}</h3>
                                            <p className="text-sm text-gray-600">{s.tutorName} · {s.subject}</p>
                                            <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
                                                <Link
                                                    href={`/admin/sessions/${s.id}`}
                                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium text-center min-h-[48px] flex items-center justify-center gap-2"
                                                >
                                                    <Eye size={18} /> View
                                                </Link>
                                                <Link
                                                    href={`/admin/sessions/${s.id}/edit`}
                                                    className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl text-sm font-medium text-center min-h-[48px] flex items-center justify-center gap-2"
                                                >
                                                    <Edit size={18} /> Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {grouped.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">
                                {viewMode === "today" ? "No sessions today." : viewMode === "week" ? "No sessions this week." : "No sessions in this month."}
                            </p>
                        </div>
                    ) : (
                        grouped.map(({ date, label, isToday, sessions: daySessions }) => (
                            <div key={date} ref={isToday ? todaySectionRef : undefined}>
                                <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2 sticky top-0 bg-gray-50/95 backdrop-blur py-2 z-10">
                                    <Calendar size={18} /> {label}
                                    {isToday && <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">Today</span>}
                                </h2>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Time</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Student</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Tutor</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Subject</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {daySessions.map(s => (
                                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                                <Clock size={14} />
                                                                {formatTime(s.startTime)} – {formatTime(s.endTime)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-gray-800">{s.studentName}</td>
                                                        <td className="px-6 py-4 text-gray-600">{s.tutorName}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                                                {s.subject}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass(s)}`}>
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 flex gap-3">
                                                            <Link href={`/admin/sessions/${s.id}`} className="text-gray-500 hover:text-primary" title="View">
                                                                <Eye size={18} />
                                                            </Link>
                                                            <Link href={`/admin/sessions/${s.id}/edit`} className="text-gray-500 hover:text-orange-500" title="Edit">
                                                                <Edit size={18} />
                                                            </Link>
                                                            <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-500" title="Delete">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <FloatingActionButton href="/admin/sessions/new" label="Add Session" />
        </div>
    );
}
