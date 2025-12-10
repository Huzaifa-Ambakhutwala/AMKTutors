"use client";

import { useState, useEffect } from "react";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, User, GraduationCap, Clock } from "lucide-react";
import Link from "next/link";

// Helper to get days in month
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminCalendarPage() {
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<Session[]>([]);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fetch Sessions
    useEffect(() => {
        async function fetchSessions() {
            setLoading(true);
            try {
                // Calculate start and end of the viewed month for efficient querying
                // Pad with a few days to cover previous/next month overlap in grid if needed
                // For simplicity, just fetching current month matching string prefix might be tricky with ISO
                // So let's use range comparison on ISO string

                const startOfMonth = new Date(year, month, 1);
                const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

                // Create ISO strings for range query
                const startStr = startOfMonth.toISOString();
                const endStr = endOfMonth.toISOString();

                // Query: sessions where startTime is within the current month
                // Note: This relies on string comparison of ISO 'YYYY-MM-DD...' which works correctly
                const q = query(
                    collection(db, "sessions"),
                    where("startTime", ">=", startStr),
                    where("startTime", "<=", endStr),
                    orderBy("startTime", "asc")
                );

                const snap = await getDocs(q);
                const fetchedSessions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));

                // Filter out cancelled if desired, though prompt didn't strictly say to hide them
                // Keeping them gives better visibility, maybe style differently
                setSessions(fetchedSessions);

            } catch (e) {
                console.error("Error fetching sessions:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchSessions();
    }, [year, month]);

    // Navigation
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Calendar Grid Generation
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);

    const calendarCells = [];
    // Padding for previous month
    for (let i = 0; i < startDay; i++) {
        calendarCells.push(null);
    }
    // Days actual
    for (let i = 1; i <= daysInMonth; i++) {
        calendarCells.push(i);
    }

    // Helper to find sessions for a specific day
    const getSessionsForDay = (day: number) => {
        return sessions.filter(s => {
            const d = new Date(s.startTime);
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
        });
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold font-heading text-gray-900 flex items-center gap-2">
                            <CalendarIcon size={28} className="text-primary" />
                            Calendar
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Manage and view upcoming tutoring sessions</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="min-w-[140px] text-center font-bold text-gray-800">
                            {MONTH_NAMES[month]} {year}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                        <div className="w-px h-6 bg-gray-200 mx-1"></div>
                        <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md text-gray-600">
                            Today
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex justify-center items-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        {/* Weekday Header */}
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px border-b border-gray-200">
                            {calendarCells.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[120px]"></div>;
                                }

                                const daySessions = getSessionsForDay(day);
                                const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                                return (
                                    <div key={day} className={`bg-white min-h-[140px] p-2 flex flex-col hover:bg-blue-50/30 transition-colors group/cell ${isToday ? 'bg-blue-50/50' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white' : 'text-gray-700'}`}>
                                                {day}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 flex-1">
                                            {daySessions.map(session => (
                                                <Link
                                                    href={`/admin/sessions/${session.id}`}
                                                    key={session.id}
                                                    className="group relative block"
                                                >
                                                    {/* Event Block */}
                                                    <div className={`
                                                        px-2 py-1 rounded text-xs border border-l-[3px] truncate shadow-sm cursor-pointer transition-all hover:scale-[1.02]
                                                        ${session.status === 'Cancelled' ? 'bg-red-50 border-red-500 text-red-700 opacity-60 line-through' :
                                                            session.status === 'Completed' ? 'bg-green-50 border-green-500 text-green-700' :
                                                                'bg-blue-50 border-primary text-blue-700'}
                                                    `}>
                                                        <span className="font-semibold">{formatTime(session.startTime)}</span>
                                                        <span className="mx-1">•</span>
                                                        <span className="font-medium">{session.studentName?.split(' ')[0]}</span>
                                                        <span className="hidden xl:inline"> - {session.subject}</span>
                                                    </div>

                                                    {/* Custom Tooltip */}
                                                    <div className="hidden group-hover:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 pointer-events-none fade-in">
                                                        <div className="font-bold text-sm text-yellow-400 mb-1">{session.subject}</div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <User size={12} className="text-gray-400" />
                                                            <span>Student: <strong>{session.studentName}</strong></span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <GraduationCap size={12} className="text-gray-400" />
                                                            <span>Tutor: <strong>{session.tutorName}</strong></span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Clock size={12} className="text-gray-400" />
                                                            <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                                                        </div>
                                                        {session.location && (
                                                            <div className="flex items-center gap-2 text-gray-300">
                                                                <MapPin size={12} className="text-gray-400" />
                                                                <span className="truncate">{session.location}</span>
                                                            </div>
                                                        )}
                                                        {session.status && (
                                                            <div className="mt-2 pt-2 border-t border-gray-700 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                                                                Status: <span className={session.status === 'Scheduled' ? 'text-blue-400' : session.status === 'Cancelled' ? 'text-red-400' : 'text-green-400'}>{session.status}</span>
                                                            </div>
                                                        )}
                                                        {/* Arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
