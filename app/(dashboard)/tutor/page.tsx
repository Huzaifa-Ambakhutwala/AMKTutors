"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Session } from "@/lib/types";
import { Loader2, ArrowLeft, MessageSquare, X, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SessionFeedback from "@/components/SessionFeedback";

export default function TutorDashboard() {
    const { user } = useCurrentUser();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    useEffect(() => {
        async function fetchSessions() {
            if (!user) return;
            try {
                // Fetch sessions for this tutor
                const q = query(collection(db, "sessions"), where("tutorId", "==", user.uid));
                const snap = await getDocs(q);

                if (snap.empty) {
                    // Fallback for demo/mismatched IDs
                    const allSnap = await getDocs(collection(db, "sessions"));
                    const list = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                    setSessions(list);
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
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleSessionUpdate = (updatedSession: Session) => {
        setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
        setSelectedSession(updatedSession); // Keep modal open with fresh data
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
                                                onClick={() => setSelectedSession(s)}
                                                className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                            >
                                                <MessageSquare size={16} /> Notes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Feedback Modal */}
                {selectedSession && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                        <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Session Notes</h3>
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
                                onUpdate={handleSessionUpdate}
                                userRole="TUTOR"
                            />
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
