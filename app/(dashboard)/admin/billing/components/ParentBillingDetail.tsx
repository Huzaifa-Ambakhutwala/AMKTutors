"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, writeBatch, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student, Session, Invoice, InvoiceItem } from "@/lib/types";
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Trash2, Calendar, DollarSign, Clock, User, Eye } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { FormFeedback } from "@/components/FormFeedback";
import InvoiceViewer from "./InvoiceViewer";

interface ParentBillingDetailProps {
    parentId: string;
    summary?: any; // Optional passed summary
    onBack: () => void;
}

export default function ParentBillingDetail({ parentId, onBack }: ParentBillingDetailProps) {
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
    const [loading, setLoading] = useState(true);
    const [parent, setParent] = useState<UserProfile | null>(null);
    const [students, setStudents] = useState<Student[]>([]);

    // Pending Data
    const [pendingSessions, setPendingSessions] = useState<(Session & { calculatedRate: number, lineTotal: number })[]>([]);
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
    const [invoiceNotes, setInvoiceNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    // History Data
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        loadDetailData();
    }, [parentId]);

    const loadDetailData = async (refresh: boolean = false) => {
        if (!refresh) setLoading(true);
        try {
            // 1. Fetch Parent
            const parentDoc = await getDoc(doc(db, "users", parentId));
            if (parentDoc.exists()) setParent(parentDoc.data() as UserProfile);

            // 2. Fetch Students
            const studentsQ = query(collection(db, "students"), where("parentIds", "array-contains", parentId));
            const studentsSnap = await getDocs(studentsQ);
            const studentsList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
            setStudents(studentsList);
            const studentIds = studentsList.map(s => s.id);
            let mergedSessions: Session[] = [];

            // 3a. Fetch Sessions by Student ID (Standard Tutoring)
            if (studentIds.length > 0) {
                const sessionsQ = query(
                    collection(db, "sessions"),
                    where("studentId", "in", studentIds),
                    where("status", "in", ["Scheduled", "Completed"])
                );
                const sessionsSnap = await getDocs(sessionsQ);
                mergedSessions = [...mergedSessions, ...sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Session))];
            }

            // 3b. Fetch Sessions by Parent ID (Assessments, etc.)
            // We fetch where parentId == parentId. 
            // Note: We also need to filter by status, but we can do client side or composite index.
            // Let's do client filter for simplicity and avoiding index issues if possible.
            const parentSessionsQ = query(
                collection(db, "sessions"),
                where("parentId", "==", parentId)
            );
            const parentSessionsSnap = await getDocs(parentSessionsQ);
            const parentSessions = parentSessionsSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Session))
                .filter(s => ["Scheduled", "Completed"].includes(s.status));

            mergedSessions = [...mergedSessions, ...parentSessions];

            // Deduplicate (in case a session matches both, though unlikely with current schema)
            const uniqueSessions = Array.from(new Map(mergedSessions.map(s => [s.id, s])).values());

            const allSessions = uniqueSessions;

            // Filter unbilled
            const unbilled = allSessions.filter(s => s.parentBilled !== true);

            // Calculate Rates
            const processed = unbilled.map(s => {
                // 1. Try to find student
                const student = studentsList.find(stu => stu.id === s.studentId);

                // 2. Determine Rate/Total
                // If session has fixed 'cost', use that.
                if (s.cost !== undefined) {
                    return {
                        ...s,
                        calculatedRate: s.cost, // effectively flat rate
                        lineTotal: s.cost
                    };
                }

                // Fallback to Hourly Rate
                const rate = student?.subjectRates?.[s.subject] || 0;
                const durationHours = s.durationMinutes / 60;

                return {
                    ...s,
                    calculatedRate: rate,
                    lineTotal: durationHours * rate
                };
            });

            // Sort by Date Ascending (Oldest first for billing)
            processed.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            setPendingSessions(processed);

            // Auto-select all by default
            setSelectedSessionIds(new Set(processed.map(s => s.id)));

            // 4. Fetch Invoice History
            const invoicesQ = query(collection(db, "invoices"), where("parentId", "==", parentId));
            const invoicesSnap = await getDocs(invoicesQ);
            const invoiceList = invoicesSnap.docs.map(d => d.data() as Invoice);
            // Sort Descending (Newest first)
            invoiceList.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
            setInvoices(invoiceList);

        } catch (e) {
            console.error("Error loading detail:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleCreateInvoice = async () => {
        if (selectedSessionIds.size === 0) return;
        if (!confirm(`Create invoice for ${selectedSessionIds.size} sessions?`)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);
            const invoiceId = uuidv4();
            const selectedItems = pendingSessions.filter(s => selectedSessionIds.has(s.id));
            const totalAmount = selectedItems.reduce((sum, s) => sum + s.lineTotal, 0);

            // Invoice Item
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

            const invoice: Invoice = {
                id: invoiceId,
                parentId: parentId,
                parentName: parent?.name || "Unknown",
                studentIds: Array.from(new Set(selectedItems.map(s => s.studentId))),
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                periodStart: new Date().toISOString(), // Simplified
                periodEnd: new Date().toISOString(),
                issueDate: new Date().toISOString(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Sent', // Auto-mark as sent? Or Draft? User said "Mark as Paid" is usually manual. Let's say 'Sent' or 'Draft'. 
                // Let's use 'Sent' as default for now or 'Draft' if you want review.
                // Re-reading user request: "After clicking create invoice...". 
                // Let's set status to 'Draft' so they can review, OR just 'Sent' to assume it's done. 
                // Let's go with 'Sent' for simplicity in this flow, or 'Unpaid'.
                // Status enum in types: 'Draft' | 'Sent' | 'Paid' | 'Overdue'.
                items,
                totalAmount,
                notes: invoiceNotes
            };

            batch.set(doc(db, "invoices", invoiceId), invoice);

            // Update Sessions
            selectedItems.forEach(s => {
                batch.update(doc(db, "sessions", s.id), {
                    parentBilled: true,
                    invoiceId: invoiceId
                });
            });

            await batch.commit();

            // Refresh
            alert("Invoice created!");
            setProcessing(false);
            setInvoiceNotes("");
            loadDetailData();
            setActiveTab('HISTORY'); // Switch to history to see it

        } catch (e) {
            console.error("Error creating invoice:", e);
            alert("Failed to create invoice");
            setProcessing(false);
        }
    };

    const handleVoidInvoice = async (invoice: Invoice) => {
        const confirmMsg = `Are you sure you want to VOID Invoice #${invoice.invoiceNumber}?\n\nThis will:\n1. Delete the invoice.\n2. Revert ${invoice.items.length} sessions back to 'Unbilled' status.`;
        if (!confirm(confirmMsg)) return;

        setProcessing(true);
        try {
            const batch = writeBatch(db);

            // 1. Delete Invoice
            batch.delete(doc(db, "invoices", invoice.id));

            // 2. Revert Sessions
            // We can find sessions by invoiceId query OR strictly trust the items list if we trust data integrity.
            // Query is safer.
            const q = query(collection(db, "sessions"), where("invoiceId", "==", invoice.id));
            const snap = await getDocs(q);

            snap.forEach(d => {
                batch.update(d.ref, {
                    parentBilled: false,
                    invoiceId: null // Remove link
                });
            });

            await batch.commit();

            alert("Invoice voided and sessions reverted.");
            loadDetailData(); // Refresh to see sessions back in Pending

        } catch (e) {
            console.error("Error voiding invoice:", e);
            alert("Failed to void invoice");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline" /> Loading Detail...</div>;
    if (!parent) return <div>Parent not found</div>;

    const pendingTotal = pendingSessions.filter(s => selectedSessionIds.has(s.id)).reduce((acc, s) => acc + s.lineTotal, 0);

    return (
        <div className="animate-fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
                <ArrowLeft size={20} /> Back to Grid
            </button>

            {/* Header */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">{parent.name}</h1>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><User size={14} /> {students.length} Students</span>
                        <span>{parent.email}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Lifetime Billed</div>
                        <div className="text-xl font-bold text-gray-900">
                            ${invoices.reduce((acc, inv) => acc + inv.totalAmount, 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'PENDING' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pending Sessions ({pendingSessions.length})
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Invoice History ({invoices.length})
                </button>
            </div>

            {/* CONTENT: PENDING */}
            {activeTab === 'PENDING' && (
                <div className="space-y-6">
                    {pendingSessions.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500">
                            <CheckCircle className="inline-block mb-2 text-green-500" size={32} />
                            <p>All caught up! No pending sessions to bill.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                                <h3 className="font-bold text-blue-900">Unbilled Sessions</h3>
                                <div className="text-sm text-blue-800">
                                    <span className="font-bold">{selectedSessionIds.size}</span> selected for invoicing
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
                                            <th className="px-4 py-3 text-right">Total</th>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Notes (Optional)</label>
                                    <textarea
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm h-16"
                                        placeholder="Add memo..."
                                        value={invoiceNotes}
                                        onChange={e => setInvoiceNotes(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-1/3 text-right space-y-3">
                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                        <span>Subtotal ({selectedSessionIds.size} items)</span>
                                        <span className="font-medium">${pendingTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={handleCreateInvoice}
                                        disabled={processing || selectedSessionIds.size === 0}
                                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2"
                                    >
                                        {processing ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                                        Generate Invoice
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
                    {invoices.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">No invoices generated yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {invoices.map(inv => (
                                <div key={inv.id} className="bg-white rounded-lg border border-gray-100 p-4 hover:border-blue-200 transition-all flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 p-3 rounded-lg text-gray-600">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{inv.invoiceNumber}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(inv.issueDate).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={12} /> {inv.items.length} sessions</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-500">Total</div>
                                            <div className="text-xl font-bold text-gray-900">${inv.totalAmount.toFixed(2)}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Actions: View, Void */}
                                            <button
                                                onClick={() => setViewInvoice(inv)}
                                                className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                                                title="View/Print/Email Invoice"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleVoidInvoice(inv)}
                                                className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Void Invoice & Revert Sessions"
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

            {viewInvoice && (
                <InvoiceViewer
                    invoice={viewInvoice}
                    onClose={() => setViewInvoice(null)}
                    onUpdate={() => loadDetailData(true)}
                />
            )}

        </div>
    );
}

