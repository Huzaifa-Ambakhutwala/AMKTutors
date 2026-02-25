"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { UserProfile, Student } from "@/lib/types";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { syncSessionToCalendar } from "@/lib/calendar-sync-client";
import { toast } from "sonner";

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

    // Recurring
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringDays, setRecurringDays] = useState<number[]>([]); // 0=Sun, 1=Mon, ... 6=Sat
    const [recurringEndAfter, setRecurringEndAfter] = useState(10); // number of occurrences
    const [recurringEndBy, setRecurringEndBy] = useState(""); // YYYY-MM-DD optional

    const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

    /** Get next N occurrence dates for weekly recurrence (daysOfWeek: 0=Sun..6=Sat). Uses startDate's time for each. */
    function getRecurringDates(startDate: Date, daysOfWeek: number[], endAfter: number, endByDateStr?: string): Date[] {
        const out: Date[] = [];
        const endBy = endByDateStr ? new Date(endByDateStr + "T23:59:59").getTime() : null;
        const startTime = startDate.getTime();
        const startHours = startDate.getHours();
        const startMins = startDate.getMinutes();
        let current = new Date(startDate);
        current.setHours(0, 0, 0, 0);
        const maxIter = 365 * 2;
        let iter = 0;
        while (out.length < endAfter && iter++ < maxIter) {
            if (daysOfWeek.includes(current.getDay())) {
                const sessionStart = new Date(current);
                sessionStart.setHours(startHours, startMins, 0, 0);
                if (sessionStart.getTime() < startTime) {
                    current.setDate(current.getDate() + 1);
                    continue;
                }
                if (endBy != null && sessionStart.getTime() > endBy) break;
                out.push(sessionStart);
            }
            current.setDate(current.getDate() + 1);
        }
        return out.slice(0, endAfter);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const student = students.find(s => s.id === selectedStudentId);
            const tutor = tutors.find(t => t.uid === selectedTutorId);

            if (!student || !tutor) throw new Error("Invalid selection");

            const startDateTime = new Date(`${date}T${time}`);
            const durationMs = parseInt(duration) * 60000;
            const seriesId = isRecurring ? "rec-" + Date.now() : null;

            const basePayload = {
                studentId: student.id,
                studentName: student.name,
                tutorId: tutor.uid,
                tutorName: tutor.name,
                subject,
                durationMinutes: parseInt(duration),
                status,
                location,
                attendance: "Present" as const,
                createdAt: new Date().toISOString(),
            };

            const primaryParentId =
                Array.isArray(student.parentIds) && student.parentIds.length > 0
                    ? student.parentIds[0]
                    : undefined;

            if (isRecurring && recurringDays.length > 0) {
                const endAfter = Math.min(Math.max(1, recurringEndAfter), 52);
                const occurrenceDates = getRecurringDates(
                    startDateTime,
                    recurringDays,
                    endAfter,
                    recurringEndBy || undefined
                );
                if (occurrenceDates.length === 0) {
                    toast.warning("No occurrence dates. Check start date and selected days.");
                    setLoading(false);
                    return;
                }
                for (const sessionStart of occurrenceDates) {
                    const sessionEnd = new Date(sessionStart.getTime() + durationMs);
                    const ref = await addDoc(collection(db, "sessions"), {
                        ...basePayload,
                        startTime: sessionStart.toISOString(),
                        endTime: sessionEnd.toISOString(),
                        ...(seriesId ? { recurringSeriesId: seriesId } : {}),
                    });
                    syncSessionToCalendar(ref.id, "create");
                    // Fire notifications for scheduled session
                    try {
                        await fetch("/api/notifications/events", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                eventType: "SESSION_SCHEDULED",
                                payload: {
                                    sessionId: ref.id,
                                    studentId: basePayload.studentId,
                                    studentName: basePayload.studentName,
                                    tutorId: basePayload.tutorId,
                                    tutorName: basePayload.tutorName,
                                    parentId: primaryParentId,
                                    sessionDate: sessionStart.toLocaleDateString(),
                                    sessionTime: sessionStart.toLocaleTimeString(),
                                    portalLink: "/parent",
                                },
                            }),
                        });
                    } catch {
                        // best-effort; ignore
                    }
                }
            } else {
                const endDateTime = new Date(startDateTime.getTime() + durationMs);
                const ref = await addDoc(collection(db, "sessions"), {
                    ...basePayload,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    ...(seriesId ? { recurringSeriesId: seriesId } : {}),
                });
                syncSessionToCalendar(ref.id, "create");
                try {
                    await fetch("/api/notifications/events", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            eventType: "SESSION_SCHEDULED",
                            payload: {
                                sessionId: ref.id,
                                studentId: basePayload.studentId,
                                studentName: basePayload.studentName,
                                tutorId: basePayload.tutorId,
                                tutorName: basePayload.tutorName,
                                parentId: primaryParentId,
                                sessionDate: startDateTime.toLocaleDateString(),
                                sessionTime: startDateTime.toLocaleTimeString(),
                                portalLink: "/parent",
                            },
                        }),
                    });
                } catch {
                    // ignore
                }
            }

            router.push("/admin/sessions");
        } catch (e) {
            console.error(e);
            toast.error("Error creating session");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none";
    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
                <div className="mb-6 md:mb-8 flex items-center gap-4">
                    <Link href="/admin/sessions" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Schedule Session</h1>
                </div>

                {dataLoading ? <Loader2 className="animate-spin" /> : (
                    <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Student Selection */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                                <select
                                    required
                                    value={selectedStudentId}
                                    onChange={e => {
                                        setSelectedStudentId(e.target.value);
                                        const s = students.find(x => x.id === e.target.value);
                                        if (s && s.subjects?.length === 1) setSubject(s.subjects[0]);
                                        else setSubject("");
                                    }}
                                    className={inputClass}
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
                                    className={inputClass}
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
                                    className={inputClass}
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
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    required
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                <select
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    className={inputClass}
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
                                    className={inputClass}
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
                                    className={inputClass}
                                    placeholder="e.g. Online, Library, Home"
                                />
                            </div>

                            {/* Recurring: Repeat weekly */}
                            <div className="md:col-span-2 border-t border-gray-200 pt-6 space-y-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={e => setIsRecurring(e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="font-medium text-gray-700">Repeat weekly</span>
                                </label>
                                {isRecurring && (
                                    <>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 mb-2">On days</p>
                                            <div className="flex flex-wrap gap-2">
                                                {WEEKDAY_LABELS.map((label, i) => (
                                                    <label key={i} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={recurringDays.includes(i)}
                                                            onChange={e => {
                                                                if (e.target.checked) setRecurringDays([...recurringDays, i].sort((a, b) => a - b));
                                                                else setRecurringDays(recurringDays.filter(d => d !== i));
                                                            }}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-gray-700">{label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">End after (occurrences)</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={52}
                                                    value={recurringEndAfter}
                                                    onChange={e => setRecurringEndAfter(parseInt(e.target.value, 10) || 1)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Or end by date (optional)</label>
                                                <input
                                                    type="date"
                                                    value={recurringEndBy}
                                                    onChange={e => setRecurringEndBy(e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                        </div>

                        <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur py-4 border-t border-gray-100 -mx-4 px-4 md:mx-0 md:px-0 safe-area-pb">
                            <Link href="/admin/sessions" className="px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
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
