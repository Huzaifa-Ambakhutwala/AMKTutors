"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session } from "@/lib/types";
import { Loader2, ArrowLeft, Mail, BookOpen, Clock, Link as LinkIcon, Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getInviteLink } from "@/lib/utils";

// Reuse categorization from Parent Detail (could refactor to utils later)
const categorizeSessions = (sessions: Session[]) => {
    // ... same as before (omitting body for brevity in replace, but keeping it if not replacing large blocks)
    // Actually, I am replacing the top block, so I need to be careful.
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

export default function TutorDetailPage() {
    const { id } = useParams();
    const tutorId = id as string;

    const [loading, setLoading] = useState(true);
    const [tutor, setTutor] = useState<UserProfile | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<{ upcoming: Session[], today: Session[], past: Session[] }>({ upcoming: [], today: [], past: [] });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Tutor
                const tutorDoc = await getDoc(doc(db, "users", tutorId));
                if (!tutorDoc.exists()) {
                    setTutor(null);
                    return;
                }
                setTutor(tutorDoc.data() as UserProfile);

                // 2. Fetch Assigned Students
                // Optimization: query(collection(db, "students"), where("tutorIds", "array-contains", tutorId))
                const allStudentsSnap = await getDocs(collection(db, "students"));
                const assignedStudents = allStudentsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Student))
                    .filter(s => s.tutorIds && s.tutorIds.includes(tutorId));

                setStudents(assignedStudents);

                // 3. Fetch Sessions for this Tutor
                // Optimization: query(collection(db, "sessions"), where("tutorId", "==", tutorId))
                const allSessionsSnap = await getDocs(collection(db, "sessions"));
                const tutorSessions = allSessionsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Session))
                    .filter(s => s.tutorId === tutorId);

                setSessions(categorizeSessions(tutorSessions));

            } catch (e) {
                console.error("Error fetching details:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [tutorId]);

    const handleCopyInvite = () => {
        if (!tutor || !tutor.inviteToken) {
            alert("No invite token available.");
            return;
        }
        const link = getInviteLink(tutor.inviteToken);
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!tutor) return <div className="p-12 text-center text-red-500">Tutor not found</div>;

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Link href="/admin/tutors" className="inline-flex items-center text-gray-500 hover:text-primary mb-4">
                    <ArrowLeft size={16} className="mr-1" /> Back to Tutors
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-heading mb-1">{tutor.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1"><Mail size={14} /> {tutor.email}</span>
                        </div>
                        {tutor.subjects && (
                            <div className="flex gap-2 mt-2">
                                {tutor.subjects.map(s => (
                                    <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {tutor.status !== 'registered' && (
                            <button
                                onClick={handleCopyInvite}
                                className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded transition hover:bg-gray-50 text-sm font-medium flex items-center gap-2"
                            >
                                {copied ? <Check size={14} className="text-green-600" /> : <LinkIcon size={14} />}
                                {copied ? "Copied Link" : "Invite Link"}
                            </button>
                        )}
                        <Link href={`/admin/tutors/${tutorId}/edit`} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded transition hover:bg-gray-50 text-sm font-medium">
                            Edit Profile
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Assigned Students */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold mb-4 font-heading border-b pb-2">Assigned Students</h2>
                        {students.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No students assigned.</p>
                        ) : (
                            <ul className="space-y-3">
                                {students.map(s => (
                                    <li key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="font-semibold text-gray-900">{s.name}</div>
                                        <div className="text-xs text-gray-500 flex justify-between mt-1">
                                            <span>{s.grade}</span>
                                            <Link href={`/admin/students/${s.id}`} className="hover:text-primary">
                                                View
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {/* Could link to "Edit Student" pages to assign them */}
                    </div>

                    <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                        <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2"><Clock size={18} /> Stats</h3>
                        <div className="space-y-2 text-sm text-purple-800">
                            <div className="flex justify-between">
                                <span>Upcoming Sessions:</span>
                                <span className="font-mono font-bold">{sessions.upcoming.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Sessions This Month:</span>
                                <span className="font-mono font-bold">--</span> {/* Placeholder for calculation */}
                            </div>
                        </div>
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
                            <div className="font-semibold text-gray-900">{s.subject} <span className="text-gray-400 font-normal mx-1">with</span> {s.studentName}</div>
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
