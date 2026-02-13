"use client";

import { useState, useEffect, useRef } from "react";
import RoleGuard from "@/components/RoleGuard";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session } from "@/lib/types";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, User, GraduationCap, Clock } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";

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
    const isMobile = useIsMobile();

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const datesScrollRef = useRef<HTMLDivElement>(null);

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
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        // Scroll to today's date cell after a tick so DOM is updated
        setTimeout(() => {
            const el = document.getElementById(`day-${today.getDate()}-${today.getMonth()}-${today.getFullYear()}`);
            el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }, 100);
    };

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

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    // Get sessions for agenda view (next 7 days or selected date)
    const getAgendaSessions = () => {
        if (selectedDate) {
            return sessions.filter(s => {
                const d = new Date(s.startTime);
                return d.toDateString() === selectedDate.toDateString();
            }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        }
        
        // Show next 7 days
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        return sessions
            .filter(s => {
                const d = new Date(s.startTime);
                return d >= today && d <= nextWeek;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    };

    const renderMobileAgenda = () => {
        const agendaSessions = getAgendaSessions();
        
        return (
            <div className="space-y-4">
                {/* Date Selector */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            onClick={prevMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-gray-800 text-lg">
                            {MONTH_NAMES[month]} {year}
                        </span>
                        <button 
                            onClick={nextMonth}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    
                    {/* Horizontally scrollable dates */}
                    <div
                        ref={datesScrollRef}
                        className="flex gap-2 overflow-x-auto pb-2 -mx-1 scroll-smooth snap-x snap-mandatory"
                        style={{ WebkitOverflowScrolling: "touch" }}
                    >
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                            const d = new Date(year, month, dayNum);
                            const dayName = WEEKDAYS[d.getDay()];
                            const daySessions = getSessionsForDay(dayNum);
                            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                            const isSelected = selectedDate && dayNum === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
                            return (
                                <button
                                    key={dayNum}
                                    id={`day-${dayNum}-${month}-${year}`}
                                    onClick={() => setSelectedDate(new Date(year, month, dayNum))}
                                    className={`flex-shrink-0 snap-center w-14 min-w-[3.5rem] rounded-xl flex flex-col items-center justify-center py-2.5 px-1 min-h-[56px] transition-colors ${
                                        isSelected
                                            ? "bg-primary text-white shadow-md"
                                            : isToday
                                            ? "bg-blue-100 text-primary font-bold border-2 border-primary"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    <span className="text-[10px] font-medium uppercase tracking-wide">{dayName}</span>
                                    <span className="text-base font-bold mt-0.5">{dayNum}</span>
                                    {daySessions.length > 0 && (
                                        <span className={`text-[10px] mt-0.5 ${isSelected ? "text-white/90" : "text-primary"}`}>
                                            {daySessions.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button 
                        onClick={goToToday}
                        className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors min-h-[48px] shadow-sm"
                    >
                        Today
                    </button>
                </div>

                {/* Sessions List */}
                <div className="space-y-3">
                    {agendaSessions.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No sessions scheduled</p>
                        </div>
                    ) : (
                        agendaSessions.map(session => (
                            <Link
                                key={session.id}
                                href={`/admin/sessions/${session.id}`}
                                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock size={16} className="text-gray-400" />
                                            <span className="font-semibold text-gray-900">
                                                {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg text-gray-900 mb-1">{session.studentName}</h3>
                                        <p className="text-sm text-gray-600">{session.subject}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        session.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                        session.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {session.status}
                                    </span>
                                </div>
                                {session.location && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                                        <MapPin size={14} />
                                        <span>{session.location}</span>
                                    </div>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="w-full max-w-full overflow-x-hidden">
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading text-gray-900 flex items-center gap-2 mb-2">
                        <CalendarIcon size={24} className="text-primary" />
                        Calendar
                    </h1>
                    <p className="text-gray-500 text-sm">Manage and view upcoming tutoring sessions</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : isMobile ? (
                    renderMobileAgenda()
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <ChevronLeft size={20} />
                            </button>
                            <span className="min-w-[140px] text-center font-bold text-gray-800 text-lg">
                                {MONTH_NAMES[month]} {year}
                            </span>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center">
                                <ChevronRight size={20} />
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                            <button onClick={goToToday} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md text-gray-600 min-h-[48px]">
                                Today
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
