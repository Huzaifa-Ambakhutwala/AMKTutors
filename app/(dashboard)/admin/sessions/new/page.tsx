"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { UserProfile, Student } from "@/lib/types";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

export default function NewSessionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Data Sources
    const [students, setStudents] = useState<Student[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    // Form State
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedTutorId, setSelectedTutorId] = useState("");
    const [subject, setSubject] = useState("");
    const [date, setDate] = useState(""); // YYYY-MM-DD
    const [time, setTime] = useState(""); // HH:MM
    const [duration, setDuration] = useState("60"); // Minutes
    const [status, setStatus] = useState<any>('Scheduled');
    const [location, setLocation] = useState("Online");

    // Derived Data
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Students
                const sSnap = await getDocs(collection(db, "students"));
                const sList = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
                setStudents(sList.filter(s => s.status === 'Active'));

                // Fetch Tutors
                const uSnap = await getDocs(collection(db, "users"));
                const uList = uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
                setTutors(uList.filter(u => (u.role === 'TUTOR' || u.role === 'ADMIN') && !u.isShadow));

            } catch (e) {
                console.error(e);
            } finally {
                setDataLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const student = students.find(s => s.id === selectedStudentId);
            const tutor = tutors.find(t => t.uid === selectedTutorId);

            if (!student || !tutor) throw new Error("Invalid selection");

            // Calculate timestamps
            const startDateTime = new Date(`${date}T${time}`);
            const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

            await addDoc(collection(db, "sessions"), {
                studentId: student.id,
                studentName: student.name,
                tutorId: tutor.uid,
                tutorName: tutor.name,
                subject,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                durationMinutes: parseInt(duration),
                status,
                location,
                attendance: 'Present', // Default placeholder
                createdAt: new Date().toISOString()
            });

            router.push("/admin/sessions");
        } catch (e) {
            console.error(e);
            alert("Error creating session");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-2xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/sessions" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Schedule Session</h1>
                </div>

                {dataLoading ? <Loader2 className="animate-spin" /> : (
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Student Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                                <select
                                    required
                                    value={selectedStudentId}
                                    onChange={e => {
                                        setSelectedStudentId(e.target.value);
                                        // Auto-select subject if they only have one
                                        const s = students.find(x => x.id === e.target.value);
                                        if (s && s.subjects.length === 1) setSubject(s.subjects[0]);
                                        else setSubject("");
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">Select Student...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                                    ))}
                                </select>
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
                                    <option value="">Select Tutor...</option>
                                    {tutors.map(t => (
                                        <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject Selection (Dependent on Student) */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <select
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    disabled={!selectedStudentId}
                                >
                                    <option value="">Select Subject...</option>
                                    {selectedStudent?.subjects.map(subj => (
                                        <option key={subj} value={subj}>{subj}</option>
                                    ))}
                                    <option value="Other">Other / Evaluation</option>
                                </select>
                                {!selectedStudentId && <p className="text-xs text-gray-400 mt-1">Select a student first to see their subjects.</p>}
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
                                disabled={loading}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                Schedule Session
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
