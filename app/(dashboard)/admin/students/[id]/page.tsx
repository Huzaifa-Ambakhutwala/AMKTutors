"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session } from "@/lib/types";
import { Loader2, ArrowLeft, GraduationCap, School, User, Calendar } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Reuse categorization (should actuaall be a util)
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

    upcoming.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    today.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    past.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return { upcoming, today, past };
};

export default function StudentDetailPage() {
    const { id } = useParams();
    const studentId = id as string;

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);
    const [parents, setParents] = useState<UserProfile[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);
    const [sessions, setSessions] = useState<{ upcoming: Session[], today: Session[], past: Session[] }>({ upcoming: [], today: [], past: [] });

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Student
                const studentDoc = await getDoc(doc(db, "students", studentId));
                if (!studentDoc.exists()) {
                    setStudent(null);
                    return;
                }
                const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
                setStudent(studentData);

                // 2. Fetch Parents & Tutors (Manual fetch by IDs for MVP)
                if (studentData.parentIds?.length > 0) {
                    const parentDocs = await Promise.all(studentData.parentIds.map(uid => getDoc(doc(db, "users", uid))));
                    setParents(parentDocs.map(d => d.data() as UserProfile).filter(Boolean));
                }

                if (studentData.tutorIds?.length > 0) {
                    const tutorDocs = await Promise.all(studentData.tutorIds.map(uid => getDoc(doc(db, "users", uid))));
                    setTutors(tutorDocs.map(d => d.data() as UserProfile).filter(Boolean));
                }

                // 3. Fetch Sessions
                // Optimization: query(collection(db, "sessions"), where("studentId", "==", studentId))
                const allSessionsSnap = await getDocs(collection(db, "sessions"));
                const studentSessions = allSessionsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Session))
                    .filter(s => s.studentId === studentId);

                setSessions(categorizeSessions(studentSessions));

            } catch (e) {
                console.error("Error fetching details:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [studentId]);

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!student) return <div className="p-12 text-center text-red-500">Student not found</div>;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/students" className="inline-flex items-center text-gray-500 hover:text-primary mb-4">
                    <ArrowLeft size={16} className="mr-1" /> Back to Students
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-heading mb-1">{student.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1"><GraduationCap size={14} /> {student.grade}</span>

                        </div>
                        <div className="mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {student.status}
                            </span>
                        </div>
                    </div>
                    <Link href={`/admin/students/${studentId}/edit`} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded transition hover:bg-gray-50 text-sm font-medium">
                        Edit Student
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Relationships Column */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Parents */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4 font-heading border-b pb-2 flex items-center gap-2">
                            <User size={18} /> Parents / Guardians
                        </h2>
                        {parents.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No parents assigned.</p>
                        ) : (
                            <ul className="space-y-3">
                                {parents.map(p => (
                                    <li key={p.uid} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="font-semibold text-gray-900">{p.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{p.email}</div>
                                        <div className="mt-1 text-right">
                                            <Link href={`/admin/parents/${p.uid}`} className="text-xs text-primary hover:underline">View Profile</Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Tutors */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4 font-heading border-b pb-2 flex items-center gap-2">
                            <School size={18} /> Assigned Tutors
                        </h2>
                        {tutors.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No tutors assigned.</p>
                        ) : (
                            <ul className="space-y-3">
                                {tutors.map(t => (
                                    <li key={t.uid} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                        <div className="font-semibold text-purple-900">{t.name}</div>
                                        <div className="text-xs text-purple-700 mt-1">
                                            {t.subjects?.join(', ')}
                                        </div>
                                        <div className="mt-1 text-right">
                                            <Link href={`/admin/tutors/${t.uid}`} className="text-xs text-purple-700 hover:underline font-medium">View Tutor</Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
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
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Upcoming Schedule
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
                            <div className="font-semibold text-gray-900">{s.subject} <span className="text-gray-400 font-normal mx-1">with</span> {s.tutorName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                                <span className="font-medium text-gray-700">{new Date(s.startTime).toLocaleString()}</span>
                            </div>
                            {s.notes && (
                                <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                                    <strong>Note:</strong> {s.notes}
                                </div>
                            )}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            s.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
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
