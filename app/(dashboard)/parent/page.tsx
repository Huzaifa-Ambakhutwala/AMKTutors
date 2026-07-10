"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Session } from "@/lib/types";
import { fetchSessionsForStudentIds } from "@/lib/sessions-query";
import { Loader2, ArrowLeft, MessageSquare, X, LogOut, Calendar, FileText, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SessionFeedback from "@/components/SessionFeedback";

export default function ParentDashboard() {
    const { profileId, loading: roleLoading } = useUserRole();
    const { logout } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentIds, setStudentIds] = useState<string[]>([]);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadStudentIds = useCallback(async () => {
        if (!profileId) return [];
        const snap = await getDocs(
            query(collection(db, "students"), where("parentIds", "array-contains", profileId))
        );
        return snap.docs.map((d) => d.id);
    }, [profileId]);

    const loadSessions = useCallback(async (ids: string[], showFullLoader = true) => {
        if (showFullLoader) setLoading(true);
        else setRefreshing(true);
        try {
            const data = await fetchSessionsForStudentIds(ids);
            setSessions(data.map((s) => ({ ...s, internalNotes: null })));
        } catch (e) {
            console.error("Error fetching sessions:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!profileId || roleLoading) return;

        let cancelled = false;

        (async () => {
            try {
                const ids = await loadStudentIds();
                if (cancelled) return;
                setStudentIds(ids);
                if (ids.length === 0) {
                    setSessions([]);
                    setLoading(false);
                    return;
                }
                await loadSessions(ids);
            } catch (e) {
                console.error("Error fetching students:", e);
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [profileId, roleLoading, loadStudentIds, loadSessions]);

    const handleRefresh = async () => {
        if (studentIds.length === 0) return;
        await loadSessions(studentIds, false);
    };

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const now = new Date();
    const upcomingSessions = sessions.filter(s => new Date(s.startTime) >= now).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const pastSessions = sessions.filter(s => new Date(s.startTime) < now);
    const sessionsWithFeedback = pastSessions.filter(s => s.parentFeedback?.text).slice(0, 5);

    return (
        <RoleGuard allowedRoles={['PARENT']}>
            <div className="p-4 md:p-8 relative max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Parent Portal</h1>
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <ArrowLeft size={20} /> Website
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
                        >
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Link
                        href="/parent/invoices"
                        className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all"
                    >
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <FileText className="text-primary" size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">My Invoices</p>
                            <p className="text-sm text-gray-500">View and track your invoices</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Calendar className="text-primary" size={24} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Sessions</p>
                            <p className="text-sm text-gray-500">All sessions listed below</p>
                        </div>
                    </div>
                </div>

                {/* Upcoming sessions widget */}
                {upcomingSessions.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock size={20} /> Upcoming ({upcomingSessions.length})
                        </h2>
                        <div className="space-y-3">
                            {upcomingSessions.slice(0, 5).map((s) => (
                                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-gray-900">{s.studentName}</p>
                                        <p className="text-sm text-gray-500">{s.subject} with {s.tutorName}</p>
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">{new Date(s.startTime).toLocaleString()}</p>
                                </div>
                            ))}
                            {upcomingSessions.length > 5 && (
                                <p className="text-sm text-gray-500">+ {upcomingSessions.length - 5} more upcoming</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent feedback widget */}
                {sessionsWithFeedback.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare size={20} /> Recent feedback
                        </h2>
                        <div className="space-y-2">
                            {sessionsWithFeedback.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
                                >
                                    <p className="font-bold text-gray-900">{s.studentName} – {s.subject}</p>
                                    <p className="text-sm text-gray-600 line-clamp-1">{s.parentFeedback?.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(s.startTime).toLocaleDateString()}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <h2 className="text-xl font-bold mb-4 flex items-center justify-between gap-3">
                    <span>All Sessions</span>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading || refreshing || studentIds.length === 0}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <RotateCcw size={16} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </h2>
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
                ) : sessions.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <p className="text-gray-500">No sessions yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 md:px-6 py-4 text-gray-700">Student</th>
                                        <th className="px-4 md:px-6 py-4 text-gray-700">Tutor</th>
                                        <th className="px-4 md:px-6 py-4 text-gray-700">Subject</th>
                                        <th className="px-4 md:px-6 py-4 text-gray-700">Time</th>
                                        <th className="px-4 md:px-6 py-4 text-gray-700">Feedback</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(s => (
                                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 md:px-6 py-4 font-medium">{s.studentName}</td>
                                            <td className="px-4 md:px-6 py-4">{s.tutorName}</td>
                                            <td className="px-4 md:px-6 py-4">{s.subject}</td>
                                            <td className="px-4 md:px-6 py-4 text-sm">{new Date(s.startTime).toLocaleString()}</td>
                                            <td className="px-4 md:px-6 py-4">
                                                {s.parentFeedback ? (
                                                    <button
                                                        onClick={() => setSelectedSession(s)}
                                                        className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                    >
                                                        <MessageSquare size={16} /> View
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Feedback Modal */}
                {selectedSession && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                        <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Session Feedback</h3>
                                <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={24} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="font-bold text-gray-900">{selectedSession.studentName}</p>
                                <p className="text-sm text-gray-500">{new Date(selectedSession.startTime).toLocaleString()}</p>
                                <p className="text-sm text-gray-500">{selectedSession.subject}</p>
                            </div>

                            <SessionFeedback
                                session={selectedSession}
                                userRole="PARENT"
                            />
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
