"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Session } from "@/lib/types";
import { Loader2, ArrowLeft, MessageSquare, X, LogOut, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ManageSessionModal from "@/components/ManageSessionModal";

export default function TutorDashboard() {
    const { user, profileId } = useUserRole();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [managingSession, setManagingSession] = useState<Session | null>(null);

    useEffect(() => {
        async function fetchSessions() {
            // Need both user (auth) and profileId (db id)
            if (!user || !profileId) return;
            try {
                // Query using the correct Profile ID (which matches the Tutor ID in sessions)
                const q = query(collection(db, "sessions"), where("tutorId", "==", profileId));
                const snap = await getDocs(q);

                if (snap.empty) {
                    // Optional: Handling empty state
                    setSessions([]);
                } else {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                    setSessions(list);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchSessions();
    }, [user, profileId]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleSessionUpdate = (updatedSession: Session) => {
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
        if (managingSession?.id === updatedSession.id) setManagingSession(updatedSession);
    };

    return (
        <RoleGuard allowedRoles={['TUTOR']}>
            <div className="p-8 relative">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Tutor Dashboard</h1>
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <ArrowLeft size={20} /> Back to Website
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
                        >
                            <LogOut size={20} /> Logout
                        </button>
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-4">My Sessions</h2>
                {loading ? <Loader2 className="animate-spin" /> : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-gray-700">Student</th>
                                    <th className="px-6 py-4 text-gray-700">Subject</th>
                                    <th className="px-6 py-4 text-gray-700">Time</th>
                                    <th className="px-6 py-4 text-gray-700">Status</th>
                                    <th className="px-6 py-4 text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{s.studentName}</td>
                                        <td className="px-6 py-4">{s.subject}</td>
                                        <td className="px-6 py-4">{new Date(s.startTime).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                s.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setManagingSession(s)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 ${s.status === 'Completed'
                                                    ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                    }`}
                                            >
                                                {s.status === 'Completed' ? <MessageSquare size={16} /> : <CheckCircle size={16} />}
                                                {s.status === 'Completed' ? "Edit Details" : "Mark Complete"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
