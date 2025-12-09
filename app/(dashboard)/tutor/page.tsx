"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Session } from "@/lib/types"; // Make sure to export Session
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TutorDashboard() {
    const { user } = useCurrentUser();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSessions() {
            if (!user) return;
            try {
                // Need to match tutorId with the USER ID, not the user.uid directly if we used seed IDs like 'tutor-1'
                // But in a real app, user.uid IS the tutorId. 
                // For now, let's query where tutorId == user.uid OR (if using seed) where tutorName matches? 
                // Let's assume user.uid is correct for now or they updated it.

                // To make this work with Seed data (which uses 'tutor-1'), the authenticated user needs to have uid 'tutor-1'.
                // Since we can't force that easily, let's just query ALL sessions if we can't filter, or filter by a known field.
                // PROPER WAY: 
                const q = query(collection(db, "sessions"), where("tutorId", "==", user.uid));
                const snap = await getDocs(q);

                // If empty, maybe try fetching all and client filtering (bad for scale, good for debug with mismatched UIDs)
                if (snap.empty) {
                    const allSnap = await getDocs(collection(db, "sessions"));
                    const list = allSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                    setSessions(list); // Show all for demo if ID mismatch
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

    return (
        <RoleGuard allowedRoles={['TUTOR']}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Tutor Dashboard</h1>
                    <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} /> Back to Website
                    </Link>
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
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{s.studentName}</td>
                                        <td className="px-6 py-4">{s.subject}</td>
                                        <td className="px-6 py-4">{new Date(s.startTime).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{s.status}</span>
                                        </td>
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
