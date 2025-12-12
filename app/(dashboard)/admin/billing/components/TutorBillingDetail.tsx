"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, writeBatch, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Session, PayStub, PayStubItem } from "@/lib/types";
import PayStubViewer from "./PayStubViewer";
import { ArrowLeft, Loader2, FileText, CheckCircle, Trash2, Calendar, Clock, DollarSign, User, Eye } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

interface TutorBillingDetailProps {
    tutorId: string;
    onBack: () => void;
}

export default function TutorBillingDetail({ tutorId, onBack }: TutorBillingDetailProps) {
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [loading, setLoading] = useState(true);
    const [tutor, setTutor] = useState<UserProfile | null>(null);

    // Pending Data
    const [pendingSessions, setPendingSessions] = useState<(Session & { calculatedRate: number, lineTotal: number })[]>([]);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
    const [payNotes, setPayNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    // History Data
    const [payStubs, setPayStubs] = useState<PayStub[]>([]);
    const [viewPayStub, setViewPayStub] = useState<PayStub | null>(null);

    useEffect(() => {
        loadDetailData();
    }, [tutorId]);

    const loadDetailData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Tutor
            const tutorDoc = await getDoc(doc(db, "users", tutorId));
            if (tutorDoc.exists()) setTutor(tutorDoc.data() as UserProfile);

            // 2. Fetch Unpaid Sessions
            // Query all scheduled sessions for this tutor where `tutorPaid` != true
            const sessionsQ = query(
                collection(db, "sessions"),
                where("tutorId", "==", tutorId),
                where("status", "in", ["Scheduled", "Completed"])
            );
            const sessionsSnap = await getDocs(sessionsQ);
            const allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session));

            // Filter unpaid
            const unpaid = allSessions.filter(s => s.tutorPaid !== true);

            // Calculate Pay
            // Rate logic: Tutor's base rate.
            const baseRate = (tutorDoc.data() as UserProfile)?.hourlyPayRate || 0;

            const processed = unpaid.map(s => {
                const durationHours = s.durationMinutes / 60;
                return {
                    ...s,
                    calculatedRate: baseRate,
                    lineTotal: durationHours * baseRate
                };
            });

            // Sort by Date Ascending
            processed.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            setPendingSessions(processed);

            // Auto-select all
            setSelectedSessionIds(new Set(processed.map(s => s.id)));

            // 3. Fetch Pay History
            const payStubsQ = query(collection(db, "payStubs"), where("tutorId", "==", tutorId));
            const payStubsSnap = await getDocs(payStubsQ);
            const list = payStubsSnap.docs.map(d => d.data() as PayStub);
            list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
            setPayStubs(list);

        } catch (e) {
            console.error("Error loading tutor detail:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleCreatePayStub = async () => {
        if (selectedSessionIds.size === 0) return;
        if (!confirm(`Create Pay Stub for ${selectedSessionIds.size} sessions?`)) return;

        setProcessing(true);
        try {
            await db.runTransaction(async (transaction) => {
                // 1. Get Settings
                const settingsRef = doc(db, "settings", "email_templates");
                const settingsDoc = await transaction.get(settingsRef);

                let nextNum = 1001;
                if (settingsDoc.exists() && settingsDoc.data().pay_stub_layout?.nextPayStubNumber) {
                    nextNum = settingsDoc.data().pay_stub_layout.nextPayStubNumber;
                }

                // 2. Prepare Data
                const stubId = uuidv4();
                const selectedItems = pendingSessions.filter(s => selectedSessionIds.has(s.id));
                const totalPay = selectedItems.reduce((sum, s) => sum + s.lineTotal, 0);
                const totalHours = selectedItems.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);

                const items: PayStubItem[] = selectedItems.map(s => ({
                    sessionId: s.id,
                    studentId: s.studentId,
                    studentName: s.studentName,
                    subject: s.subject,
                    date: s.startTime,
                    durationHours: s.durationMinutes / 60,
                    hourlyRate: s.calculatedRate,
                    total: s.lineTotal
                }));

                const stub: PayStub = {
                    id: stubId,
                    tutorId: tutorId,
                    tutorName: tutor?.name || "Unknown",
                    payStubNumber: `PAY-${nextNum}`,
                    periodStart: new Date().toISOString(),
                    periodEnd: new Date().toISOString(),
                    issueDate: new Date().toISOString(),
                    totalHours,
                    totalPay,
                    items,
                    status: 'Paid',
                    notes: payNotes
                };

                // 3. Writes
                transaction.set(doc(db, "payStubs", stubId), stub);

                selectedItems.forEach(s => {
                    transaction.update(doc(db, "sessions", s.id), {
                        tutorPaid: true,
                        payStubId: stubId
                    });
                });

                // 4. Increment
                transaction.set(settingsRef, {
                    pay_stub_layout: { nextPayStubNumber: nextNum + 1 }
                }, { merge: true });
            });

            // Refresh
            alert("Pay Stub recorded!");
            setProcessing(false);
            setPayNotes("");
            loadDetailData();
            setActiveTab('HISTORY');

        } catch (e) {
            console.error("Error creating pay stub:", e);
            alert("Failed to create pay stub");
            setProcessing(false);
        }
    };

    const handleVoidPayStub = async (stub: PayStub) => {
        const confirmMsg = `Are you sure you want to VOID Pay Stub from ${new Date(stub.issueDate).toLocaleDateString()}?\n\nThis will:\n1. Delete the record.\n2. Revert ${stub.items.length} sessions back to 'Unpaid' status.`;
        if (!confirm(confirmMsg)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);

            // 1. Delete Stub
            batch.delete(doc(db, "payStubs", stub.id));

            // 2. Revert Sessions
            const q = query(collection(db, "sessions"), where("payStubId", "==", stub.id));
            const snap = await getDocs(q);

            snap.forEach(d => {
                batch.update(d.ref, {
                    tutorPaid: false,
                    payStubId: null
                });
            });

            await batch.commit();

            alert("Pay Stub voided and sessions reverted.");
            loadDetailData();

        } catch (e) {
            console.error("Error voiding pay stub:", e);
            alert("Failed to void pay stub");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline" /> Loading Detail...</div>;
    if (!tutor) return <div>Tutor not found</div>;

    const pendingTotal = pendingSessions.filter(s => selectedSessionIds.has(s.id)).reduce((acc, s) => acc + s.lineTotal, 0);

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
                <ArrowLeft size={20} /> Back to Grid
            </button>

            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{tutor.name}</h1>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><DollarSign size={14} /> ${(tutor.hourlyPayRate || 0).toFixed(2)} / hr</span>
                        <span>{tutor.email}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Lifetime Earnings</div>
                    <div className="text-xl font-bold text-green-600">
                        ${payStubs.reduce((acc, stub) => acc + stub.totalPay, 0).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'PENDING' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Pay ({pendingSessions.length})
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pay History ({payStubs.length})
                </button>
            </div>

            {/* CONTENT: PENDING */}
            {activeTab === 'PENDING' && (
                <div className="space-y-6">
                    {pendingSessions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500">
                            <CheckCircle className="inline-block mb-2 text-green-500" size={32} />
                            <p>All caught up! No pending sessions to pay.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-green-50/50 border-b border-green-100 flex justify-between items-center">
                                <h3 className="font-bold text-green-900">Unpaid Sessions</h3>
                                <div className="text-sm text-green-800">
                                    <span className="font-bold">{selectedSessionIds.size}</span> selected
                                </div>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 backdrop-blur-sm bg-gray-50/90 z-10">
                                        <tr>
                                            <th className="px-4 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSessionIds.size === pendingSessions.length}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedSessionIds(new Set(pendingSessions.map(s => s.id)));
                                                        else setSelectedSessionIds(new Set());
                                                    }}
                                                    className="rounded border-gray-300"
                                                />
                                            </th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Student</th>
                                            <th className="px-4 py-3">Subject</th>
                                            <th className="px-4 py-3">Duration</th>
                                            <th className="px-4 py-3 text-right">Rate</th>
                                            <th className="px-4 py-3 text-right">Pay Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pendingSessions.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSessionIds.has(s.id)}
                                                        onChange={() => {
                                                            const next = new Set(selectedSessionIds);
                                                            if (next.has(s.id)) next.delete(s.id);
                                                            else next.add(s.id);
                                                            setSelectedSessionIds(next);
                                                        }}
                                                        className="rounded border-gray-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{new Date(s.startTime).toLocaleDateString()}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{s.studentName}</td>
                                                <td className="px-4 py-3 text-gray-600">{s.subject}</td>
                                                <td className="px-4 py-3 text-gray-600">{(s.durationMinutes / 60).toFixed(2)} hrs</td>
                                                <td className="px-4 py-3 text-right text-gray-600">${s.calculatedRate}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">${s.lineTotal.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-end gap-6">
                                <div className="w-full md:w-2/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay Stub Notes (Optional)</label>
                                    <textarea
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm h-16"
                                        placeholder="Add memo..."
                                        value={payNotes}
                                        onChange={e => setPayNotes(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-1/3 text-right space-y-3">
                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                        <span>Subtotal ({selectedSessionIds.size} items)</span>
                                        <span className="font-medium">${pendingTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={handleCreatePayStub}
                                        disabled={processing || selectedSessionIds.size === 0}
                                        className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2"
                                    >
                                        {processing ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />}
                                        Record Pay Stub
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENT: HISTORY */}
            {activeTab === 'HISTORY' && (
                <div className="space-y-4">
                    {payStubs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">No pay recorded yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {payStubs.map(stub => (
                                <div key={stub.id} className="bg-white rounded-lg border border-gray-100 p-4 hover:border-green-200 transition-all flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-50 p-3 rounded-lg text-green-600">
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">Pay Stub</span>
                                                <span className="text-gray-500 text-sm">{new Date(stub.issueDate).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {stub.totalHours.toFixed(2)} hrs</span>
                                                <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> {stub.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Total</div>
                                            <div className="text-xl font-bold text-gray-900">${stub.totalPay.toFixed(2)}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setViewPayStub(stub)}
                                                className="bg-green-50 text-green-600 p-2 rounded-lg hover:bg-green-100 transition-colors"
                                                title="View/Print Pay Stub"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleVoidPayStub(stub)}
                                                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Void Pay Stub & Revert Sessions"
                                                disabled={processing}
                                            >
                                                {processing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {viewPayStub && (
                <PayStubViewer
                    payStub={viewPayStub}
                    onClose={() => setViewPayStub(null)}
                />
            )}

        </div>
    );
}
