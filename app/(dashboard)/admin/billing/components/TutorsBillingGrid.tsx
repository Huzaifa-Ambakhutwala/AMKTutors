"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Session } from "@/lib/types";
import { Loader2, Search, User, DollarSign, Calendar, ChevronRight } from "lucide-react";
import TutorBillingDetail from "./TutorBillingDetail";

interface TutorBillingSummary {
    tutor: UserProfile;
    unpaidSessionCount: number;
    unpaidAmount: number;
}

export default function TutorsBillingGrid() {
    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<TutorBillingSummary[]>([]);
    const [filtered, setFiltered] = useState<TutorBillingSummary[]>([]);
    const [search, setSearch] = useState("");

    const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        async function loadData() {
            try {
                // 1. Fetch Tutors
                const tutorsQuery = query(collection(db, "users"), where("role", "==", "TUTOR"));
                const tutorsSnap = await getDocs(tutorsQuery);
                const tutors = tutorsSnap.docs
                    .map(d => d.data() as UserProfile)
                    .filter(u => !(u as any).isShadow);

                // 2. Fetch Unpaid Sessions (Status=Scheduled OR Completed)
                const sessionsQuery = query(collection(db, "sessions"), where("status", "in", ["Scheduled", "Completed"]));
                const sessionsSnap = await getDocs(sessionsQuery);
                const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

                // 3. Aggregate
                const stats: TutorBillingSummary[] = tutors.map(tutor => {
                    // Find sessions for this tutor
                    const mySessions = allSessions.filter(s =>
                        s.tutorId === tutor.uid &&
                        s.tutorPaid !== true
                    );

                    // Calculate totals
                    // Rate: defaulting to tutor.hourlyPayRate or 0
                    const rate = tutor.hourlyPayRate || 0;

                    let totalUnpaid = 0;
                    mySessions.forEach(session => {
                        const hours = session.durationMinutes / 60;
                        totalUnpaid += (hours * rate);
                    });

                    return {
                        tutor,
                        unpaidSessionCount: mySessions.length,
                        unpaidAmount: totalUnpaid
                    };
                });

                // Sort by unpaid amount desc
                stats.sort((a, b) => b.unpaidAmount - a.unpaidAmount);

                setSummaries(stats);
                setFiltered(stats);

            } catch (e) {
                console.error("Error loading tutor billing data:", e);
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
                s.tutor.name.toLowerCase().includes(lower) ||
                s.tutor.email.toLowerCase().includes(lower)
            ));
        }
    }, [search, summaries]);


    if (selectedTutorId) {
        return (
            <TutorBillingDetail
                tutorId={selectedTutorId}
                onBack={() => setSelectedTutorId(null)}
            />
        );
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-green-600" size={32} /></div>;

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search tutors..."
                        className="w-full pl-10 p-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="text-right text-gray-500 text-sm">
                    Showing {filtered.length} tutors
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(({ tutor, unpaidSessionCount, unpaidAmount }) => (
                    <div
                        key={tutor.uid}
                        onClick={() => setSelectedTutorId(tutor.uid)}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-green-200 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Status Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${unpaidAmount > 0 ? 'bg-orange-400' : 'bg-gray-200'}`} />

                        <div className="flex justify-between items-start mb-4 pl-2">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 group-hover:text-green-600 transition-colors">
                                    {tutor.name}
                                </h3>
                                <p className="text-sm text-gray-500">{tutor.email}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-full group-hover:bg-green-50 text-gray-400 group-hover:text-green-600 transition-colors">
                                <ChevronRight size={20} />
                            </div>
                        </div>

                        <div className="pl-2 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign size={16} className="text-gray-400" />
                                <span>Rate: ${(tutor.hourlyPayRate || 0).toFixed(2)}/hr</span>
                            </div>

                            {/* Unpaid Stats */}
                            <div className="pt-3 border-t border-gray-50 flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">To Pay</p>
                                    <div className={`flex items-center gap-1.5 font-bold text-2xl ${unpaidAmount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                        <span className="text-lg text-gray-400">$</span>
                                        {unpaidAmount.toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg text-sm font-medium text-gray-600">
                                        <Calendar size={14} />
                                        {unpaidSessionCount} Sessions
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No tutors found matching "{search}"
                </div>
            )}
        </div>
    );
}
