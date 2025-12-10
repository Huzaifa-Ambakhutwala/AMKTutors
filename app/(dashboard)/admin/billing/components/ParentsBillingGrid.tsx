"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session } from "@/lib/types";
import { Loader2, Search, User, DollarSign, Calendar, ChevronRight } from "lucide-react";
import ParentBillingDetail from "./ParentBillingDetail";

interface ParentBillingSummary {
    parent: UserProfile;
    students: Student[];
    unbilledSessionCount: number;
    unbilledAmount: number;
}

export default function ParentsBillingGrid() {
    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<ParentBillingSummary[]>([]);
    const [filtered, setFiltered] = useState<ParentBillingSummary[]>([]);
    const [search, setSearch] = useState("");

    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Fetch Parents
                const parentsQuery = query(collection(db, "users"), where("role", "==", "PARENT"));
                const parentsSnap = await getDocs(parentsQuery);
                const parents = parentsSnap.docs.map(d => d.data() as UserProfile);

                // 2. Fetch Students
                const studentsQuery = query(collection(db, "students")); // Optimization: filter locally if too many?
                const studentsSnap = await getDocs(studentsQuery);
                const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));

                // 3. Fetch Unbilled Sessions (Status=Scheduled OR Completed)
                const sessionsQuery = query(collection(db, "sessions"), where("status", "in", ["Scheduled", "Completed"]));
                const sessionsSnap = await getDocs(sessionsQuery);
                const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

                // 4. Aggregate
                const stats: ParentBillingSummary[] = parents.map(parent => {
                    // Find children
                    const myStudents = allStudents.filter(s => s.parentIds?.includes(parent.uid));
                    const myStudentIds = new Set(myStudents.map(s => s.id));

                    // Find unbilled sessions for these students
                    const unbilledSessions = allSessions.filter(s =>
                        myStudentIds.has(s.studentId) &&
                        s.parentBilled !== true
                    );

                    // Calculate totals
                    let totalUnbilled = 0;
                    unbilledSessions.forEach(session => {
                        const student = myStudents.find(s => s.id === session.studentId);
                        const rate = student?.subjectRates?.[session.subject] || 0;
                        const hours = session.durationMinutes / 60;
                        totalUnbilled += (hours * rate);
                    });

                    return {
                        parent,
                        students: myStudents,
                        unbilledSessionCount: unbilledSessions.length,
                        unbilledAmount: totalUnbilled
                    };
                });

                // Sort by unbilled amount desc
                stats.sort((a, b) => b.unbilledAmount - a.unbilledAmount);

                setSummaries(stats);
                setFiltered(stats);

            } catch (e) {
                console.error("Error loading billing data:", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Filter effect
    useEffect(() => {
        if (!search.trim()) {
            setFiltered(summaries);
        } else {
            const lower = search.toLowerCase();
            setFiltered(summaries.filter(s =>
                s.parent.name.toLowerCase().includes(lower) ||
                s.parent.email.toLowerCase().includes(lower)
            ));
        }
    }, [search, summaries]);


    if (selectedParentId) {
        const selectedSummary = summaries.find(s => s.parent.uid === selectedParentId);
        return (
            <ParentBillingDetail
                parentId={selectedParentId}
                summary={selectedSummary} // Pass cached summary to avoid re-fetch? Or refetch fresh.
                onBack={() => setSelectedParentId(null)}
            />
        );
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search parents..."
                        className="w-full pl-10 p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="text-right text-gray-500 text-sm">
                    Showing {filtered.length} parents
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(({ parent, students, unbilledSessionCount, unbilledAmount }) => (
                    <div
                        key={parent.uid}
                        onClick={() => setSelectedParentId(parent.uid)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${unbilledAmount > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />

                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {parent.name}
                                </h3>
                                <p className="text-sm text-gray-500">{parent.email}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full group-hover:bg-blue-50 text-gray-400 group-hover:text-blue-600 transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>

                        <div className="pl-2 space-y-3">
                            {/* Students */}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User size={16} className="text-gray-400" />
                                <span>{students.map(s => s.name).join(", ") || "No Students"}</span>
                            </div>

                            {/* Unbilled Stats */}
                            <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Pending Invoice</p>
                                    <div className={`flex items-center gap-1.5 font-bold text-2xl ${unbilledAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                        <span className="text-lg text-gray-400">$</span>
                                        {unbilledAmount.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg text-sm font-medium text-gray-600">
                                        <Calendar size={14} />
                                        {unbilledSessionCount} Sessions
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No parents found matching "{search}"
                </div>
            )}
        </div>
    );
}
