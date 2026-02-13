"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const SUBJECT_OPTIONS = ["Math", "English", "Science", "History", " SAT/ACT", "Spanish", "French", "Other"];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AddStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Form State
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");


    // New Fields
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [subjectRates, setSubjectRates] = useState<Record<string, number>>({});

    const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(1);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [preferredTimes, setPreferredTimes] = useState<Record<string, string>>({});

    const [selectedParents, setSelectedParents] = useState<string[]>([]);
    const [selectedTutors, setSelectedTutors] = useState<string[]>([]);

    // Data Lists
    const [parents, setParents] = useState<UserProfile[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const snap = await getDocs(collection(db, "users"));
                const users = snap.docs.map(d => d.data() as UserProfile);
                setParents(users.filter(u => u.role === 'PARENT' && !u.isShadow));
                setTutors(users.filter(u => (u.role === 'TUTOR' || u.role === 'ADMIN') && !u.isShadow));
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
            await addDoc(collection(db, "students"), {
                name,
                grade,

                parentIds: selectedParents,
                tutorIds: selectedTutors,
                subjects: selectedSubjects,
                subjectRates: subjectRates,
                plannedSessions: {
                    sessionsPerWeek,
                    daysOfWeek: selectedDays,
                    preferredTime: preferredTimes
                },
                status: 'Active',
                createdAt: new Date().toISOString()
            });
            router.push("/admin/students");
        } catch (e) {
            alert("Error adding student");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string, currentList: string[], setter: (val: string[]) => void) => {
        if (currentList.includes(id)) {
            setter(currentList.filter(x => x !== id));
        } else {
            setter([...currentList, id]);
        }
    };

    const handleDayToggle = (day: string) => {
        if (selectedDays.includes(day)) {
            // Remove day and its time
            setSelectedDays(selectedDays.filter(d => d !== day));
            const newTimes = { ...preferredTimes };
            delete newTimes[day];
            setPreferredTimes(newTimes);
        } else {
            // Add day with empty time (user will set it)
            setSelectedDays([...selectedDays, day]);
            setPreferredTimes({ ...preferredTimes, [day]: "" });
        }
    };

    const handleTimeChange = (day: string, time: string) => {
        setPreferredTimes({ ...preferredTimes, [day]: time });
    };

    const handleSubjectToggle = (subject: string) => {
        if (selectedSubjects.includes(subject)) {
            setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
            // Optional: Remove rate logic if needed, but keeping it is fine
            const newRates = { ...subjectRates };
            delete newRates[subject];
            setSubjectRates(newRates);
        } else {
            setSelectedSubjects([...selectedSubjects, subject]);
            setSubjectRates({ ...subjectRates, [subject]: 40 }); // Default rate $40
        }
    };

    const handleRateChange = (subject: string, rate: string) => {
        setSubjectRates({
            ...subjectRates,
            [subject]: parseFloat(rate) || 0
        });
    };

    const inputClass = "w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
                <div className="mb-6 md:mb-8 flex items-center gap-4">
                    <Link href="/admin/students" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Add New Student</h1>
                </div>

                {dataLoading ? <Loader2 className="animate-spin" /> : (
                    <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">Student Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Full Name</label>
                                    <input
                                        required type="text" value={name} onChange={e => setName(e.target.value)}
                                        className={inputClass}
                                        placeholder="Student Name"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Grade Level</label>
                                    <input
                                        required type="text" value={grade} onChange={e => setGrade(e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. 10th Grade"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Subjects & Rates */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">Subjects & Rates</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Select Subjects</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {SUBJECT_OPTIONS.map(subj => (
                                        <button
                                            key={subj}
                                            type="button"
                                            onClick={() => handleSubjectToggle(subj)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedSubjects.includes(subj)
                                                ? 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            {subj}
                                        </button>
                                    ))}
                                </div>

                                {selectedSubjects.length > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">Hourly Rates Per Subject ($)</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {selectedSubjects.map(subj => (
                                                <div key={subj}>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{subj}</label>
                                                    <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        value={subjectRates[subj] || ""}
                                                        onChange={(e) => handleRateChange(subj, e.target.value)}
                                                        className="w-full px-3 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                                        placeholder="Rate"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Planned Sessions */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">Planned Sessions (Optional)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sessions Per Week</label>
                                    <input
                                        type="number" min="0" max="14" inputMode="numeric"
                                        value={sessionsPerWeek}
                                        onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week & Times</label>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => handleDayToggle(day)}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${selectedDays.includes(day)
                                                ? 'bg-green-100 text-green-700 border-green-200 ring-2 ring-green-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>

                                {selectedDays.length > 0 && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-700 mb-3">Set Time for Each Selected Day</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {selectedDays.map(day => (
                                                <div key={day}>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">{day}</label>
                                                    <input
                                                        type="time"
                                                        value={preferredTimes[day] || ""}
                                                        onChange={(e) => handleTimeChange(day, e.target.value)}
                                                        className="w-full px-3 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Relationships */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">Assign Relationships</h2>

                            {/* Parents */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Parents</label>
                                <div className="flex flex-wrap gap-2">
                                    {parents.map(p => (
                                        <button
                                            key={p.uid}
                                            type="button"
                                            onClick={() => toggleSelection(p.uid, selectedParents, setSelectedParents)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedParents.includes(p.uid)
                                                ? 'bg-purple-100 text-purple-700 border-purple-200 ring-2 ring-purple-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                                }`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                    {parents.length === 0 && <span className="text-sm text-gray-400 italic">No parents found.</span>}
                                </div>
                            </div>

                            {/* Tutors */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Tutors</label>
                                <div className="flex flex-wrap gap-2">
                                    {tutors.map(t => (
                                        <button
                                            key={t.uid}
                                            type="button"
                                            onClick={() => toggleSelection(t.uid, selectedTutors, setSelectedTutors)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedTutors.includes(t.uid)
                                                ? 'bg-orange-100 text-orange-700 border-orange-200 ring-2 ring-orange-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                                                }`}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                    {tutors.length === 0 && <span className="text-sm text-gray-400 italic">No tutors found.</span>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur py-4 border-t border-gray-100 mt-8 -mx-4 px-4 md:mx-0 md:px-0 safe-area-pb">
                            <Link href="/admin/students" className="px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                Save Student
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
