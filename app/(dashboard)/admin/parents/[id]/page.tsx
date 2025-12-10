"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session } from "@/lib/types";
import { Loader2, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Utility to categorize sessions
const categorizeSessions = (sessions: Session[]) => {
    const now = new Date();
    const todayStr = now.toDateString();

    const upcoming: Session[] = [];
    const today: Session[] = [];
    const past: Session[] = [];

    sessions.forEach(s => {
        const d = new Date(s.startTime);
        if (d.toDateString() === todayStr) {
            today.push(s);
        } else if (d > now) {
            upcoming.push(s);
        } else {
            past.push(s);
        }
    });

    // Sort: Upcoming (Ascending), Past (Descending)
    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    today.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return { upcoming, today, past };
};

export default function ParentDetailPage() {
    const { id } = useParams();
    const parentId = id as string;

    const [loading, setLoading] = useState(true);
    const [parent, setParent] = useState<UserProfile | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<{ upcoming: Session[], today: Session[], past: Session[] }>({ upcoming: [], today: [], past: [] });

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Parent
                const parentDoc = await getDoc(doc(db, "users", parentId));
                if (!parentDoc.exists()) {
                    setParent(null);
                    return;
                }
                setParent(parentDoc.data() as UserProfile);

                // 2. Fetch Children (Students linked to this parent)
                // Optimization: Use Query with index: query(collection(db, "students"), where("parentIds", "array-contains", parentId))
                // For MVP/No-Index Fallback: Fetch all and filter
                const allStudentsSnap = await getDocs(collection(db, "students"));
                const linkedStudents = allStudentsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Student))
                    .filter(s => s.parentIds && s.parentIds.includes(parentId));

                setStudents(linkedStudents);

                // 3. Fetch Sessions for these students
                const allSessionsSnap = await getDocs(collection(db, "sessions"));
                const studentIds = linkedStudents.map(s => s.id);

                const linkedSessions = allSessionsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Session))
                    .filter(s => studentIds.includes(s.studentId));

                setSessions(categorizeSessions(linkedSessions));

            } catch (e) {
                console.error("Error fetching details:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [parentId]);

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!parent) return <div className="p-12 text-center text-red-500">Parent not found</div>;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/parents" className="inline-flex items-center text-gray-500 hover:text-primary mb-4">
                    <ArrowLeft size={16} className="mr-1" /> Back to Parents
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-heading mb-1">{parent.name}</h1>
                        <div className="flex gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1"><Mail size={14} /> {parent.email}</span>
                            {parent.phone && <span className="flex items-center gap-1"><Phone size={14} /> {parent.phone}</span>}
                        </div>
                        {parent.address && <div className="mt-2 text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {parent.address}</div>}
                    </div>
                    <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded transition hover:bg-gray-50 text-sm font-medium">
                        Edit Profile
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Children Column */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4 font-heading border-b pb-2">Children</h2>
                        {students.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No students linked.</p>
                        ) : (
                            <ul className="space-y-3">
                                {students.map(s => (
                                    <li key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="font-semibold text-gray-900">{s.name}</div>
                                        <div className="text-xs text-gray-500 flex justify-between mt-1">
                                            <span>{s.grade}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{s.status}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link href="/admin/students/new" className="mt-4 block text-center w-full py-2 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors">
                            + Link / Add Child
                        </Link>
                    </div>

                    {/* Could add Billing Summary here later */}
                </div>

                {/* Sessions Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Today */}
                    {sessions.today.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold mb-3 text-green-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Today's Sessions
                            </h3>
                            <SessionList sessions={sessions.today} />
                        </div>
                    )}

                    {/* Upcoming */}
                    <div>
                        <h3 className="text-lg font-bold mb-3 text-blue-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Upcoming Sessions
                        </h3>
                        {sessions.upcoming.length === 0 ? (
                            <p className="text-gray-500 text-sm italic mb-4">No upcoming sessions scheduled.</p>
                        ) : (
                            <SessionList sessions={sessions.upcoming} />
                        )}
                    </div>

                    {/* Past */}
                    <div>
                        <h3 className="text-lg font-bold mb-3 text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span> Past Sessions
                        </h3>
                        {sessions.past.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No past sessions.</p>
                        ) : (
                            <SessionList sessions={sessions.past} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SessionList({ sessions }: { sessions: Session[] }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
                {sessions.map(s => (
                    <div key={s.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-start">
                        <div>
                            <div className="font-semibold text-gray-900">{s.subject} <span className="text-gray-400 font-normal mx-1">with</span> {s.studentName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                                <span className="font-medium text-gray-700">{s.tutorName}</span> • {new Date(s.startTime).toLocaleString()}
                            </div>
                            {s.notes && (
                                <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                                    <strong>Note:</strong> {s.notes}
                                </div>
                            )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            s.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                s.status === 'NoShow' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                            }`}>
                            {s.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
