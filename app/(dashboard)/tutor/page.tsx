"use client";

import { useEffect, useState, useCallback } from "react";
import RoleGuard from "@/components/RoleGuard";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { Session } from "@/lib/types";
import { fetchSessionsForTutor } from "@/lib/sessions-query";
import { Loader2, ArrowLeft, MessageSquare, LogOut, CheckCircle, MapPin, StickyNote, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ManageSessionModal from "@/components/ManageSessionModal";

export default function TutorDashboard() {
    const { user, profileId } = useUserRole();
    const { logout } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [managingSession, setManagingSession] = useState<Session | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadSessions = useCallback(async (showFullLoader = true) => {
        if (!profileId) return;
        if (showFullLoader) setLoading(true);
        else setRefreshing(true);
        try {
            const userDoc = await getDoc(doc(db, "users", profileId));
            let logicalTutorId = profileId;
            if (userDoc.exists()) {
                const data = userDoc.data() as { pointer?: string };
                if (data.pointer) logicalTutorId = data.pointer;
            }
            const list = await fetchSessionsForTutor(logicalTutorId);
            setSessions(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profileId]);

    useEffect(() => {
        if (!user || !profileId) return;
        loadSessions();
    }, [user, profileId, loadSessions]);

    const handleRefresh = () => loadSessions(false);

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const handleSessionUpdate = (updatedSession: Session) => {
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
        if (managingSession?.id === updatedSession.id) setManagingSession(updatedSession);
    };

    const activeSessions = sessions
        .filter(s => s.status !== "Completed")
        .sort((a, b) => {
            const cancelledRank = (x: Session) => (x.status === "Cancelled" ? 1 : 0);
            const rc = cancelledRank(a) - cancelledRank(b);
            if (rc !== 0) return rc;
            return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
    const completedSessions = sessions
        .filter(s => s.status === "Completed")
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return (
        <RoleGuard allowedRoles={['TUTOR']}>
            <div className="p-8 relative">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Tutor Dashboard</h1>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-primary font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <ArrowLeft size={20} /> Back to Website
                        </Link>
                        <Link href="/tutor/availability" className="flex items-center gap-2 text-primary hover:bg-primary/10 font-medium px-4 py-2 rounded-lg transition-colors">
                            Set availability
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
                        >
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">My Sessions</h2>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                        <RotateCcw size={16} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
                {loading ? <Loader2 className="animate-spin" /> : (
                    <div className="space-y-10">
                        <section>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Upcoming and active</h3>
                            {activeSessions.length === 0 ? (
                                <p className="text-gray-500 text-sm">No scheduled sessions right now.</p>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                                    <table className="w-full text-left min-w-[720px]">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Student</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Subject</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">Time</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Location</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm min-w-[180px]">Notes</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Status</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSessions.map(s => (
                                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                                                    <td className="px-4 py-3 font-medium text-sm">{s.studentName}</td>
                                                    <td className="px-4 py-3 text-sm">{s.subject}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(s.startTime).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {s.location ? (
                                                            <span className="inline-flex items-start gap-1.5 text-gray-800">
                                                                <MapPin size={14} className="shrink-0 mt-0.5 text-primary" />
                                                                <span className="whitespace-pre-wrap">{s.location}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {s.notes ? (
                                                            <span className="inline-flex items-start gap-1.5">
                                                                <StickyNote size={14} className="shrink-0 mt-0.5 text-amber-600" />
                                                                <span className="line-clamp-3 whitespace-pre-wrap">{s.notes}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === "Cancelled" ? "bg-red-100 text-red-700" :
                                                            s.status === "NoShow" ? "bg-orange-100 text-orange-800" :
                                                                "bg-[#1A2742]/10 text-primary"
                                                            }`}>
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => setManagingSession(s)}
                                                            className="px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                                                        >
                                                            <CheckCircle size={16} />
                                                            Mark Complete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        <section>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Completed</h3>
                            {completedSessions.length === 0 ? (
                                <p className="text-gray-500 text-sm">No completed sessions yet.</p>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                                    <table className="w-full text-left min-w-[720px]">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Student</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Subject</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">Time</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Location</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm min-w-[180px]">Notes</th>
                                                <th className="px-4 py-3 text-gray-700 text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {completedSessions.map(s => (
                                                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                                                    <td className="px-4 py-3 font-medium text-sm">{s.studentName}</td>
                                                    <td className="px-4 py-3 text-sm">{s.subject}</td>
                                                    <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(s.startTime).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {s.location ? (
                                                            <span className="inline-flex items-start gap-1.5 text-gray-800">
                                                                <MapPin size={14} className="shrink-0 mt-0.5 text-primary" />
                                                                <span className="whitespace-pre-wrap">{s.location}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {s.notes ? (
                                                            <span className="inline-flex items-start gap-1.5">
                                                                <StickyNote size={14} className="shrink-0 mt-0.5 text-amber-600" />
                                                                <span className="line-clamp-3 whitespace-pre-wrap">{s.notes}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => setManagingSession(s)}
                                                            className="px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                                        >
                                                            <MessageSquare size={16} />
                                                            Edit Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* Unified Manage Session Modal */}
                {managingSession && (
                    <ManageSessionModal
                        session={managingSession}
                        onClose={() => setManagingSession(null)}
                        onUpdate={handleSessionUpdate}
                    />
                )}
            </div>
        </RoleGuard>
    );
}
