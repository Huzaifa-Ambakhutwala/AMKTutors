"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, Calendar, Clock, RotateCcw, Edit, Trash2, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import FloatingActionButton from "@/components/FloatingActionButton";

function groupSessionsByDate(sessions: Session[]): { date: string; label: string; sessions: Session[] }[] {
    const map = new Map<string, Session[]>();
    sessions.forEach(s => {
        const d = new Date(s.startTime);
        const key = d.toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    return sorted.map(([date, sess]) => ({
        date,
        label: new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
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
    const isMobile = useIsMobile();

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            await deleteDoc(doc(db, "sessions", id));
            setSessions(sessions.filter(s => s.id !== id));
        } catch (e) {
            console.error(e);
            alert("Error deleting session");
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "sessions"));
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Session));
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
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">All Sessions</h1>
                    <button
                        onClick={fetchSessions}
                        className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                        title="Refresh"
                    >
                        <RotateCcw size={20} className="text-gray-500" />
                    </button>
                </div>
                <Link
                    href="/admin/sessions/new"
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
                >
                    <Plus size={20} /> Schedule Session
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : isMobile ? (
                <div className="space-y-6 pb-24">
                    {sessions.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No sessions found.</p>
                        </div>
                    ) : (
                        groupSessionsByDate(sessions).map(({ date, label, sessions: daySessions }) => (
                            <div key={date}>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <Calendar size={16} /> {label}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Date & Time</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Student</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Tutor</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Subject</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sessions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{new Date(s.startTime).toLocaleDateString()}</span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
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
                                {sessions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            No sessions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <FloatingActionButton href="/admin/sessions/new" label="Add Session" />
        </div>
    );
}
