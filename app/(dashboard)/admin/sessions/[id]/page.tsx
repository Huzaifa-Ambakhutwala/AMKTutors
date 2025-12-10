"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, FileText, CheckCircle, XCircle, AlertCircle, User, GraduationCap, Edit } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import SessionFeedback from "@/components/SessionFeedback";

export default function SessionDetailPage() {
    const { id } = useParams();
    const sessionId = id as string;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        async function fetchSession() {
            try {
                const docRef = doc(db, "sessions", sessionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSession({ id: docSnap.id, ...docSnap.data() } as Session);
                } else {
                    alert("Session not found");
                    router.push("/admin/sessions");
                }
            } catch (e) {
                console.error("Error fetching session:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, [sessionId, router]);

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!session) return <div className="p-12 text-center text-red-500">Session not found</div>;

    const statusColors = {
        'Scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
        'Completed': 'bg-green-100 text-green-800 border-green-200',
        'Cancelled': 'bg-red-100 text-red-800 border-red-200',
        'NoShow': 'bg-orange-100 text-orange-800 border-orange-200',
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link href="/admin/sessions" className="inline-flex items-center text-gray-500 hover:text-primary mb-4 transition-colors">
                        <ArrowLeft size={16} className="mr-1" /> Back to Sessions
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold font-heading mb-2 text-gray-900">Session Details</h1>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[session.status] || 'bg-gray-100 text-gray-800'}`}>
                                    {session.status}
                                </span>
                                {session.attendance && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                        Attendance: {session.attendance}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Link
                            href={`/admin/sessions/${session.id}/edit`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Edit size={16} /> Edit Session
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Info Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Time & Location</h2>

                        <div className="flex items-start gap-3">
                            <Calendar className="text-primary mt-0.5" size={20} />
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</label>
                                <p className="text-gray-900 font-medium text-lg">
                                    {new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Clock className="text-primary mt-0.5" size={20} />
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Time & Duration</label>
                                <p className="text-gray-900 font-medium text-lg">
                                    {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-gray-500 text-sm">Duration: {session.durationMinutes} minutes</p>
                            </div>
                        </div>

                        {session.location && (
                            <div className="flex items-start gap-3">
                                <MapPin className="text-primary mt-0.5" size={20} />
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</label>
                                    <p className="text-gray-900 font-medium text-lg">{session.location}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Participants Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                        <h2 className="text-lg font-bold border-b pb-2 mb-4">Participants & Subject</h2>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</label>
                                <p className="text-gray-900 font-medium text-lg">{session.subject}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                <User size={24} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</label>
                                <Link href={`/admin/students/${session.studentId}`} className="text-primary font-medium text-lg hover:underline block">
                                    {session.studentName}
                                </Link>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                <GraduationCap size={24} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Tutor</label>
                                <Link href={`/admin/tutors/${session.tutorId}`} className="text-primary font-medium text-lg hover:underline block">
                                    {session.tutorName}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details (Notes/Homework) */}
                    {(session.notes || session.homework) && (
                        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-lg font-bold border-b pb-2 mb-4">Notes & Homework</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {session.notes && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Session Notes</label>
                                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-gray-800 text-sm whitespace-pre-wrap">
                                            {session.notes}
                                        </div>
                                    </div>
                                )}
                                {session.homework && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Homework Assigned</label>
                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-800 text-sm whitespace-pre-wrap">
                                            {session.homework}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <SessionFeedback session={session} onUpdate={setSession} userRole="ADMIN" />
            </div>
        </RoleGuard>
    );
}
