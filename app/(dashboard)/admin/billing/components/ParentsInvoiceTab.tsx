"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session, Invoice, InvoiceItem } from "@/lib/types";
import { Loader2, CheckCircle, Calendar, Search } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function ParentsInvoiceTab() {
    // State
    const [parents, setParents] = useState<UserProfile[]>([]);
    const [selectedParentId, setSelectedParentId] = useState("");
    const [students, setStudents] = useState<Student[]>([]);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loadingParents, setLoadingParents] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [eligibleSessions, setEligibleSessions] = useState<(Session & { calculatedRate: number, lineTotal: number })[]>([]);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());

    const [invoiceNotes, setInvoiceNotes] = useState("");

    // Fetch Parents on Mount
    useEffect(() => {
        async function fetchParents() {
            try {
                const q = query(collection(db, "users"), where("role", "==", "PARENT"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => d.data() as UserProfile);
                setParents(list);
            } catch (e) {
                console.error("Error fetching parents:", e);
            } finally {
                setLoadingParents(false);
            }
        }
        fetchParents();
    }, []);

    // Load Sessions Logic
    const handleLoadSessions = async () => {
        if (!selectedParentId) {
            alert("Please select a parent");
            return;
        }
        setLoadingSessions(true);
        setEligibleSessions([]);
        setSelectedSessionIds(new Set());

        try {
            // 1. Fetch Students for this Parent
            const studentsQuery = query(collection(db, "students"), where("parentIds", "array-contains", selectedParentId));
            const studentsSnap = await getDocs(studentsQuery);
            const studentsList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
            setStudents(studentsList);

            if (studentsList.length === 0) {
                alert("No students found for this parent.");
                setLoadingSessions(false);
                return;
            }

            const studentIds = studentsList.map(s => s.id);

            // 2. Fetch Eligible Sessions
            // We can't query "parentBilled == false" easily if the field is missing on old docs. 
            // Better to fetch all scheduled for these students and filter in memory for 'parentBilled !== true'
            // Also apply date range filter in memory or query if possible. 
            // Firestore 'in' limit is 10. If >10 students, need multiple queries. Assuming <10 for now.

            let allSessions: Session[] = [];

            // Chunking for safety if > 10 students
            const chunkSize = 10;
            for (let i = 0; i < studentIds.length; i += chunkSize) {
                const chunk = studentIds.slice(i, i + chunkSize);
                const q = query(
                    collection(db, "sessions"),
                    where("studentId", "in", chunk),
                    where("status", "==", "Scheduled")
                );
                const snap = await getDocs(q);
                const chunkSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
                allSessions = [...allSessions, ...chunkSessions];
            }

            // 3. Filter and Calculate
            const filtered = allSessions.filter(s => {
                // Not already billed
                if (s.parentBilled) return false;

                // Date Filter
                if (startDate && new Date(s.startTime) < new Date(startDate)) return false;
                if (endDate && new Date(s.startTime) > new Date(endDate + "T23:59:59")) return false; // Include end date fully

                return true;
            });

            // Calculate Rates
            const processed = filtered.map(s => {
                const student = studentsList.find(stu => stu.id === s.studentId);
                const rate = student?.subjectRates?.[s.subject] || 0;
                const durationHours = s.durationMinutes / 60;
                return {
                    ...s,
                    calculatedRate: rate,
                    lineTotal: durationHours * rate
                };
            });

            // Sort by Date
            processed.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            setEligibleSessions(processed);

            // Auto-select all? Yes, usually convenient.
            const ids = new Set(processed.map(s => s.id));
            setSelectedSessionIds(ids);

        } catch (e) {
            console.error("Error loading sessions:", e);
            alert("Error loading sessions");
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (selectedSessionIds.size === 0) {
            alert("No sessions selected");
            return;
        }
        if (!confirm(`Generate invoice for ${selectedSessionIds.size} sessions? This will mark them as billed.`)) return;

        setSubmitting(true);
        try {
            const batch = writeBatch(db);
            const invoiceId = uuidv4();

            const selectedItems = eligibleSessions.filter(s => selectedSessionIds.has(s.id));
            const totalAmount = selectedItems.reduce((sum, s) => sum + s.lineTotal, 0);

            // Prepare Invoice Items
            const items: InvoiceItem[] = selectedItems.map(s => ({
                description: `${s.subject} Session - ${new Date(s.startTime).toLocaleDateString()}`,
                quantity: s.durationMinutes / 60,
                rate: s.calculatedRate,
                total: s.lineTotal,
                sessionId: s.id,
                studentId: s.studentId,
                studentName: s.studentName,
                date: s.startTime
            }));

            // Create Invoice Doc
            const invoiceRef = doc(db, "invoices", invoiceId);
            const parentName = parents.find(p => p.uid === selectedParentId)?.name || "Unknown Parent";

            const invoiceData: Invoice = {
                id: invoiceId,
                parentId: selectedParentId,
                parentName,
                studentIds: Array.from(new Set(selectedItems.map(s => s.studentId))),
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                periodStart: startDate || new Date().toISOString(),
                periodEnd: endDate || new Date().toISOString(),
                issueDate: new Date().toISOString(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days default
                status: 'Draft',
                items,
                totalAmount,
                notes: invoiceNotes
            };

            batch.set(invoiceRef, invoiceData);

            // Update Sessions
            selectedItems.forEach(s => {
                const sessionRef = doc(db, "sessions", s.id);
                batch.update(sessionRef, {
                    parentBilled: true,
                    invoiceId: invoiceId
                });
            });

            await batch.commit();

            alert("Invoice generated successfully!");
            // Reset / Refresh
            setEligibleSessions([]);
            setSelectedSessionIds(new Set());
            setInvoiceNotes("");

        } catch (e) {
            console.error("Error creating invoice:", e);
            alert("Error creating invoice");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper for checkboxes
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Parent</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedParentId}
                            onChange={e => setSelectedParentId(e.target.value)}
                        >
                            <option value="">-- Choose Parent --</option>
                            {parents.map(p => (
                                <option key={p.uid} value={p.uid}>{p.name} ({p.email})</option>
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
                        disabled={loadingSessions || !selectedParentId}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loadingSessions ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        Load Scheduled Sessions
                    </button>
                </div>
            </div>

            {eligibleSessions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-700">Billable Sessions</h3>
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
                                    <th className="px-4 py-3">Rate</th>
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
                                        <td className="px-4 py-3">${s.calculatedRate.toFixed(2)}/hr</td>
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
                                    <td className="px-4 py-3 text-right text-blue-600 text-lg">
                                        ${eligibleSessions.filter(s => selectedSessionIds.has(s.id)).reduce((acc, s) => acc + s.lineTotal, 0).toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                            <div className="w-full md:w-1/2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Notes (Optional)</label>
                                <textarea
                                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Add a note to this invoice..."
                                    value={invoiceNotes}
                                    onChange={e => setInvoiceNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <button
                                onClick={handleGenerateInvoice}
                                disabled={submitting || selectedSessionIds.size === 0}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all transform hover:scale-105 active:scale-95"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                                Create Invoice & Mark Billed
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
