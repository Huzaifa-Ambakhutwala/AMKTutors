"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Session, PayStub, PayStubItem } from "@/lib/types";
import { Loader2, CheckCircle, Search } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function TutorsPayTab() {
    // State
    const [tutors, setTutors] = useState<UserProfile[]>([]);
    const [selectedTutorId, setSelectedTutorId] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loadingTutors, setLoadingTutors] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Extended session type for local calculations
    const [eligibleSessions, setEligibleSessions] = useState<(Session & { calculatedHourlyPay: number, lineTotal: number })[]>([]);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

    const [notes, setNotes] = useState("");

    // Fetch Tutors
    useEffect(() => {
        async function fetchTutors() {
            try {
                // Fetch users with role TUTOR
                const q = query(collection(db, "users"), where("role", "==", "TUTOR"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => d.data() as UserProfile);
                setTutors(list);
            } catch (e) {
                console.error("Error fetching tutors:", e);
            } finally {
                setLoadingTutors(false);
            }
        }
        fetchTutors();
    }, []);

    // Load Sessions
    const handleLoadSessions = async () => {
        if (!selectedTutorId) {
            alert("Please select a tutor");
            return;
        }
        setLoadingSessions(true);
        setEligibleSessions([]);
        setSelectedSessionIds(new Set());

        try {
            // Find tutor profile to get pay rate
            const tutorProfile = tutors.find(t => t.uid === selectedTutorId);
            const hourlyPayRate = tutorProfile?.hourlyPayRate || 0;

            // Query: tutorId == selected, status == Completed
            // Note: firestore requires index for composite queries usually.
            // If query fails, might need index.
            // "tutorId" == X AND "status" == "Completed"

            // We also need to check 'tutorPaid' != true.
            // Let's fetch all COMPLETED sessions for this tutor and filter in memory for 'tutorPaid'

            const q = query(
                collection(db, "sessions"),
                where("tutorId", "==", selectedTutorId),
                where("status", "==", "Completed")
            );

            const snap = await getDocs(q);
            const allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

            // Filter
            const filtered = allSessions.filter(s => {
                if (s.tutorPaid) return false;

                // Date Filter
                if (startDate && new Date(s.startTime) < new Date(startDate)) return false;
                if (endDate && new Date(s.startTime) > new Date(endDate + "T23:59:59")) return false;

                return true;
            });

            // Calculate
            const processed = filtered.map(s => {
                const durationHours = s.durationMinutes / 60;
                return {
                    ...s,
                    calculatedHourlyPay: hourlyPayRate,
                    lineTotal: durationHours * hourlyPayRate
                };
            });

            // Sort
            processed.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            setEligibleSessions(processed);
            setSelectedSessionIds(new Set(processed.map(s => s.id))); // Select all by default

        } catch (e) {
            console.error("Error loading sessions:", e);
            alert("Error loading sessions (Check console for index errors if newly deployed)");
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleGeneratePayStub = async () => {
        if (selectedSessionIds.size === 0) {
            alert("No sessions selected");
            return;
        }
        if (!confirm(`Generate Pay Stub for ${selectedSessionIds.size} sessions?`)) return;

        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            const payStubId = uuidv4();

            const selectedItems = eligibleSessions.filter(s => selectedSessionIds.has(s.id));
            const totalPay = selectedItems.reduce((sum, s) => sum + s.lineTotal, 0);
            const totalHours = selectedItems.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);

            // Prepare Items
            const items: PayStubItem[] = selectedItems.map(s => ({
                sessionId: s.id,
                studentId: s.studentId,
                studentName: s.studentName,
                subject: s.subject,
                date: s.startTime,
                durationHours: s.durationMinutes / 60,
                hourlyRate: s.calculatedHourlyPay,
                total: s.lineTotal
            }));

            // Create PayStub Doc
            // We use a separate collection 'tutorPayStubs' or just 'payStubs'
            // Let's use 'payStubs' to be generic? Or 'tutor_pay_stubs'?
            // The plan said: "Create a document in tutorPayStubs"
            const payStubRef = doc(db, "tutorPayStubs", payStubId);
            const tutorName = tutors.find(t => t.uid === selectedTutorId)?.name || "Unknown Tutor";

            const payStubData: PayStub = {
                id: payStubId,
                tutorId: selectedTutorId,
                tutorName,
                periodStart: startDate || new Date().toISOString(),
                periodEnd: endDate || new Date().toISOString(),
                issueDate: new Date().toISOString(),
                totalHours,
                totalPay,
                items,
                status: 'Draft', // or Paid? Usually "Draft" until actually paid out via bank, but maybe just "Paid" if this tracks it. Plan says "status: Draft | Paid"
                notes
            };

            batch.set(payStubRef, payStubData);

            // Update Sessions
            selectedItems.forEach(s => {
                const sessionRef = doc(db, "sessions", s.id);
                batch.update(sessionRef, {
                    tutorPaid: true,
                    payStubId: payStubId
                });
            });

            await batch.commit();

            alert("Pay Stub generated successfully!");
            setEligibleSessions([]);
            setSelectedSessionIds(new Set());
            setNotes("");

        } catch (e) {
            console.error(e);
            alert("Error generating pay stub");
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedSessionIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedSessionIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedSessionIds.size === eligibleSessions.length) {
            setSelectedSessionIds(new Set());
        } else {
            setSelectedSessionIds(new Set(eligibleSessions.map(s => s.id)));
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Tutor</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedTutorId}
                            onChange={e => setSelectedTutorId(e.target.value)}
                        >
                            <option value="">-- Choose Tutor --</option>
                            {tutors.map(t => (
                                <option key={t.uid} value={t.uid}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleLoadSessions}
                        disabled={loadingSessions || !selectedTutorId}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loadingSessions ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        Load Completed Sessions
                    </button>
                </div>
            </div>

            {eligibleSessions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700">Payable Sessions</h3>
                        <div className="text-sm text-gray-500">
                            Selected: <strong>{selectedSessionIds.size}</strong> sessions
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={eligibleSessions.length > 0 && selectedSessionIds.size === eligibleSessions.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3">Subject</th>
                                    <th className="px-4 py-3">Duration</th>
                                    <th className="px-4 py-3">Pay Rate</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eligibleSessions.map(s => (
                                    <tr key={s.id} className={`border-b border-gray-50 hover:bg-blue-50 transition-colors ${selectedSessionIds.has(s.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedSessionIds.has(s.id)}
                                                onChange={() => toggleSelect(s.id)}
                                                className="rounded border-gray-300"
                                            />
                                        </td>
                                        <td className="px-4 py-3">{new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-4 py-3 font-medium">{s.studentName}</td>
                                        <td className="px-4 py-3">{s.subject}</td>
                                        <td className="px-4 py-3">{(s.durationMinutes / 60).toFixed(2)} hrs</td>
                                        <td className="px-4 py-3 text-gray-500">${s.calculatedHourlyPay.toFixed(2)}/hr</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">${s.lineTotal.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right">Selected Totals:</td>
                                    <td className="px-4 py-3">
                                        {eligibleSessions.filter(s => selectedSessionIds.has(s.id)).reduce((acc, s) => acc + (s.durationMinutes / 60), 0).toFixed(2)} hrs
                                    </td>
                                    <td></td>
                                    <td className="px-4 py-3 text-right text-green-600 text-lg">
                                        ${eligibleSessions.filter(s => selectedSessionIds.has(s.id)).reduce((acc, s) => acc + s.lineTotal, 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                            <div className="w-full md:w-1/2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Stub Notes</label>
                                <textarea
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Add a note..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <button
                                onClick={handleGeneratePayStub}
                                disabled={submitting || selectedSessionIds.size === 0}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all transform hover:scale-105 active:scale-95"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                                Create Pay Stub
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
