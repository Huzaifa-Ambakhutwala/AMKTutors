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
    const [preferredTime, setPreferredTime] = useState("");

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
                    preferredTime
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

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-4xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/students" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Add New Student</h1>
                </div>

                {dataLoading ? <Loader2 className="animate-spin" /> : (
                    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">

                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold border-b pb-2">Student Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        required type="text" value={name} onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        placeholder="Student Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                                    <input
                                        required type="text" value={grade} onChange={e => setGrade(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
                                                        value={subjectRates[subj] || ""}
                                                        onChange={(e) => handleRateChange(subj, e.target.value)}
                                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary outline-none"
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
                                        type="number" min="0" max="14"
                                        value={sessionsPerWeek}
                                        onChange={(e) => setSessionsPerWeek(parseInt(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                                    <input
                                        type="time"
                                        value={preferredTime}
                                        onChange={(e) => setPreferredTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleSelection(day, selectedDays, setSelectedDays)}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${selectedDays.includes(day)
                                                    ? 'bg-green-100 text-green-700 border-green-200 ring-2 ring-green-500/20'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
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

                        <div className="pt-6 flex justify-end gap-3 sticky bottom-4 bg-white/95 backdrop-blur py-4 border-t border-gray-100 mt-8">
                            <Link href="/admin/students" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
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
