"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Session } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ParentDashboard() {
    const { user } = useCurrentUser();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSessions() {
            if (!user) return;
            try {
                // Fetch students linked to this parent (user.uid)
                // Then fetch sessions for those students
                // For MVP, assume we can query sessions directly if we had a parentId on session? 
                // Or just show all for demo if ID mismatch, similar to Tutor.

                // Ideal: 
                // 1. Get user doc to find studentIds 
                // 2. Query sessions where studentId IN studentIds

                // For Demo: Fetch all
                const allSnap = await getDocs(collection(db, "sessions"));
                const list = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                setSessions(list);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchSessions();
    }, [user]);

    return (
        <RoleGuard allowedRoles={['PARENT']}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Parent Portal</h1>
                    <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} /> Back to Website
                    </Link>
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
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{s.studentName}</td>
                                        <td className="px-6 py-4">{s.tutorName}</td>
                                        <td className="px-6 py-4">{s.subject}</td>
                                        <td className="px-6 py-4">{new Date(s.startTime).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
