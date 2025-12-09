"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, Calendar, Clock, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function SessionsListPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states could go here (e.g. by status, tutor, etc.)

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // Fetch all sessions (in a real app, you'd paginate)
            const q = query(collection(db, "sessions"));
            // Note: orderBy requires an index if combining with where clauses. Keeping it simple for MVP.

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));

            // Client-side sort by date descending (newest first)
            data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            setSessions(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold font-heading">All Sessions</h1>
                    <button onClick={fetchSessions} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Refresh">
                        <RotateCcw size={18} className="text-gray-500" />
                    </button>
                </div>
                {/* <Link href="/admin/sessions/new" className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              + Schedule Session
          </Link> */}
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date & Time</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Student</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Tutor</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Subject</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {sessions.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900">{new Date(s.startTime).toLocaleDateString()}</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' '}-{' '}
                                                {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-800">{s.studentName}</td>
                                    <td className="px-6 py-4 text-gray-600">{s.tutorName}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                                            {s.subject}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                                s.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    s.status === 'NoShow' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {sessions.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No sessions found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
