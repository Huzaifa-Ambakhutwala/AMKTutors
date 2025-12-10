"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Session } from "@/lib/types";
import { Loader2, ArrowLeft, MessageSquare, X, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SessionFeedback from "@/components/SessionFeedback";

export default function ParentDashboard() {
    const { user } = useCurrentUser();
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    useEffect(() => {
        async function fetchSessions() {
            if (!user) return;
            try {
                // 1. Find all students belonging to this parent
                const studentsQuery = query(collection(db, "students"), where("parentIds", "array-contains", user.uid));
                const studentsSnap = await getDocs(studentsQuery);

                if (studentsSnap.empty) {
                    setSessions([]);
                    setLoading(false);
                    return;
                }

                const studentIds = studentsSnap.docs.map(d => d.id);

                // 2. Fetch sessions for these students
                // Firestore 'in' query supports up to 10 items. If a parent has >10 kids, we'd need multiple queries, 
                // but for now 'in' is fine or doing parallel requests.
                // Let's do parallel requests for each student to adhere to the precise logic of "sessions for this student".
                // Actually 'in' query is better if < 10 students.

                let allSessions: Session[] = [];

                if (studentIds.length > 0) {
                    // We can use 'in' operator to fetch all at once if length <= 10
                    if (studentIds.length <= 10) {
                        const q = query(collection(db, "sessions"), where("studentId", "in", studentIds));
                        const snap = await getDocs(q);
                        allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                    } else {
                        // Fallback: fetch for each student (unlikely to hit >10 limit for parents)
                        const promises = studentIds.map(sid =>
                            getDocs(query(collection(db, "sessions"), where("studentId", "==", sid)))
                        );
                        const snaps = await Promise.all(promises);
                        snaps.forEach(s => {
                            const studentSessions = s.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                            allSessions = [...allSessions, ...studentSessions];
                        });
                    }
                }

                // 3. Process and Sanitize
                const safeList = allSessions.map(s => {
                    // CRITICAL: Strip internal notes
                    return { ...s, internalNotes: null };
                });

                // Sort by date (newest first)
                safeList.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                setSessions(safeList);
            } catch (e) {
                console.error("Error fetching sessions:", e);
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

    return (
        <RoleGuard allowedRoles={['PARENT']}>
            <div className="p-8 relative">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Parent Portal</h1>
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

                <h2 className="text-xl font-bold mb-4">Upcoming Sessions</h2>
                {loading ? <Loader2 className="animate-spin" /> : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-gray-700">Student</th>
                                    <th className="px-6 py-4 text-gray-700">Tutor</th>
                                    <th className="px-6 py-4 text-gray-700">Subject</th>
                                    <th className="px-6 py-4 text-gray-700">Time</th>
                                    <th className="px-6 py-4 text-gray-700">Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{s.studentName}</td>
                                        <td className="px-6 py-4">{s.tutorName}</td>
                                        <td className="px-6 py-4">{s.subject}</td>
                                        <td className="px-6 py-4">{new Date(s.startTime).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            {s.parentFeedback ? (
                                                <button
                                                    onClick={() => setSelectedSession(s)}
                                                    className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    <MessageSquare size={16} /> View Feedback
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-sm italic">No feedback</span>
                                            )}
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
