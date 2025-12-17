"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { UserProfile, Student, Session } from "@/lib/types";
import { Loader2, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

export default function EditSessionPage() {
    const router = useRouter();
    const { id } = useParams();
    const sessionId = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data Sources
    const [students, setStudents] = useState<Student[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    // Form State
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedTutorId, setSelectedTutorId] = useState("");
    const [subject, setSubject] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState("60");
    const [status, setStatus] = useState<any>('Scheduled');
    const [attendance, setAttendance] = useState<any>('Present');
    const [minutesLate, setMinutesLate] = useState(0);
    const [location, setLocation] = useState("");

    // Derived Data
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Session
                const sessDoc = await getDoc(doc(db, "sessions", sessionId));
                if (!sessDoc.exists()) {
                    alert("Session not found");
                    router.push("/admin/sessions");
                    return;
                }
                const session = sessDoc.data() as Session;

                // Parse date/time
                const startObj = new Date(session.startTime);
                setDate(startObj.toISOString().split('T')[0]); // YYYY-MM-DD
                setTime(startObj.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })); // HH:MM

                setSelectedStudentId(session.studentId);
                setSelectedTutorId(session.tutorId);
                setSubject(session.subject);
                setDuration(session.durationMinutes.toString());
                setStatus(session.status);
                setAttendance(session.attendance || 'Present');
                setMinutesLate(session.minutesLate || 0);
                setLocation(session.location || "Online");

                // 2. Fetch Lists
                const sSnap = await getDocs(collection(db, "students"));
                const allStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
                setStudents(allStudents);

                const uSnap = await getDocs(query(collection(db, "users"), where("role", "in", ["TUTOR", "ADMIN"])));
                // Allow both TUTOR and ADMIN to be selected as tutors
                const allTutors = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)).filter(u => !u.isShadow);
                setTutors(allTutors);

                // Debugging consistency
                if (session.studentId && !allStudents.find(s => s.id === session.studentId)) {
                    console.warn(`Student ID ${session.studentId} not found in students list.`);
                }
                if (session.tutorId && !allTutors.find(t => t.uid === session.tutorId)) {
                    console.warn(`Tutor ID ${session.tutorId} not found in tutors/admins list.`);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [sessionId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const student = students.find(s => s.id === selectedStudentId);
            const tutor = tutors.find(t => t.uid === selectedTutorId);

            if ((!student && subject !== 'Evaluation' && !selectedStudentId?.includes('EVALUATION')) || !tutor) {
                console.error("Selection Error:", { selectedStudentId, selectedTutorId, studentFound: !!student, tutorFound: !!tutor });
                throw new Error("Invalid Student or Tutor selection. Please verify they exist.");
            }

            // Calculate timestamps
            const startDateTime = new Date(`${date}T${time}`);
            const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

            await updateDoc(doc(db, "sessions", sessionId), {
                studentId: student?.id || selectedStudentId, // Keep existing ID if special
                studentName: student?.name || undefined, // Don't overwrite name if using special ID, or let it merge
                tutorId: tutor.uid,
                tutorName: tutor.name,
                subject,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                durationMinutes: parseInt(duration),
                status,
                attendance,
                minutesLate: attendance === 'Late' ? minutesLate : 0,
                location
            });

            router.push("/admin/sessions");
        } catch (e) {
            console.error(e);
            alert("Error updating session");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-2xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/sessions" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Edit Session</h1>
                </div>

                {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Student Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                                {subject === 'Evaluation' || selectedStudentId?.includes('EVALUATION') ? (
                                    // Read-only view for Assessment sessions to prevent validation errors
                                    <input
                                        type="text"
                                        value={students.find(s => s.id === selectedStudentId)?.name || (status === 'Completed' || status === 'Scheduled' ? "Potential Student (Evaluation)" : "")}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                                        placeholder="Student Name"
                                    />
                                ) : (
                                    <select
                                        required
                                        value={selectedStudentId}
                                        onChange={e => setSelectedStudentId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="" disabled>Select Student...</option>
                                        {students.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Tutor Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tutor</label>
                                <select
                                    required
                                    value={selectedTutorId}
                                    onChange={e => setSelectedTutorId(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="" disabled>Select Tutor...</option>
                                    {tutors.map(t => (
                                        <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject Selection (Dependent on Student) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                {subject === 'Evaluation' ? (
                                    <input
                                        type="text"
                                        value="Evaluation"
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                                    />
                                ) : (
                                    <select
                                        required
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="">Select Subject...</option>
                                        {selectedStudent?.subjects.map(subj => (
                                            <option key={subj} value={subj}>{subj}</option>
                                        ))}
                                        <option value="Other">Other / Evaluation</option>
                                    </select>
                                )}
                            </div>

                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    required
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    required
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                <select
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="30">30 Minutes</option>
                                    <option value="45">45 Minutes</option>
                                    <option value="60">1 Hour</option>
                                    <option value="90">1.5 Hours</option>
                                    <option value="120">2 Hours</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                    <option value="NoShow">No Show</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance</label>
                                <select
                                    value={attendance}
                                    onChange={e => setAttendance(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="Present">Present</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Late">Late</option>
                                </select>
                            </div>

                            {attendance === 'Late' && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Minutes Late</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            value={minutesLate}
                                            onChange={e => setMinutesLate(parseInt(e.target.value) || 0)}
                                            className="w-full pl-3 pr-10 py-2 border border-yellow-300 rounded-lg bg-yellow-50 focus:ring-2 focus:ring-yellow-500 outline-none"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">mins</span>
                                    </div>
                                </div>
                            )}


                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="e.g. Online, Library, Home"
                                />
                            </div>

                        </div>

                        <div className="pt-6 flex justify-end gap-3 border-t">
                            <Link href="/admin/sessions" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-accent transition-colors flex items-center gap-2"
                            >
                                {submitting && <Loader2 className="animate-spin" size={18} />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
