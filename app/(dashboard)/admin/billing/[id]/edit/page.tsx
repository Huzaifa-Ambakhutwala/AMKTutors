"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Invoice, InvoiceItem } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export default function EditInvoicePage() {
    const router = useRouter();
    const { id } = useParams();
    const invoiceId = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [parents, setParents] = useState<UserProfile[]>([]);

    // Form State
    const [selectedParentId, setSelectedParentId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [status, setStatus] = useState<Invoice['status']>('Sent');

    const [items, setItems] = useState<InvoiceItem[]>([]);

    useEffect(() => {
        async function initData() {
            try {
                // 1. Fetch Parents
                const snap = await getDocs(collection(db, "users"));
                const parentList = snap.docs
                    .map(d => d.data() as UserProfile)
                    .filter(u => u.role === 'PARENT');
                setParents(parentList);

                // 2. Fetch Invoice
                const invDoc = await getDoc(doc(db, "invoices", invoiceId));
                if (!invDoc.exists()) {
                    alert("Invoice not found");
                    router.push("/admin/billing");
                    return;
                }
                const inv = invDoc.data() as Invoice;
                setSelectedParentId(inv.parentId);
                setInvoiceNumber(inv.invoiceNumber);
                setIssueDate(inv.issueDate);
                setDueDate(inv.dueDate);
                setStatus(inv.status);
                setItems(inv.items);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        initData();
    }, [invoiceId, router]);

    // Update totals when Qty/Rate change
    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };

        if (field === 'description') {
            item.description = value as string;
        } else {
            const val = Number(value);
            if (field === 'quantity') item.quantity = val;
            if (field === 'rate') item.rate = val;
            item.total = item.quantity * item.rate;
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: "", quantity: 1, rate: 0, total: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateGrandTotal = () => {
        return items.reduce((acc, curr) => acc + curr.total, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParentId) {
            alert("Please select a parent");
            return;
        }
        setSubmitting(true);

        try {
            const parent = parents.find(p => p.uid === selectedParentId);

            await updateDoc(doc(db, "invoices", invoiceId), {
                parentId: selectedParentId,
                parentName: parent?.name || "Unknown",
                invoiceNumber,
                issueDate,
                dueDate,
                status,
                items,
                totalAmount: calculateGrandTotal(),
            });

            router.push("/admin/billing");
        } catch (e) {
            console.error(e);
            alert("Error updating invoice");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/admin/billing" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold font-heading">Edit Invoice</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">

                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Bill To (Parent)</label>
                        <select
                            required
                            value={selectedParentId}
                            onChange={e => setSelectedParentId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="">Select Parent...</option>
                            {parents.map(p => (
                                <option key={p.uid} value={p.uid}>{p.name} ({p.email})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Invoice #</label>
                            <input
                                type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Issue Date</label>
                            <input
                                type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                            <input
                                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                            <select
                                value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                            >
                                <option value="Draft">Draft</option>
                                <option value="Sent">Sent</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
                        <Calculator size={18} /> Services / Line Items
                    </h3>

                    <div className="space-y-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded"
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                                    <input
                                        type="number" min="0"
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-center"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Rate ($)</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={item.rate}
                                        onChange={e => updateItem(idx, 'rate', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded text-right"
                                    />
                                </div>
                                <div className="w-24 text-right pb-2 font-mono font-bold">
                                    ${(item.total).toFixed(2)}
                                </div>
                                <div className="pb-1">
                                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 text-sm font-medium text-primary hover:text-blue-700 flex items-center gap-1"
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                            <span>Total:</span>
                            <span>${calculateGrandTotal().toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex justify-end gap-4">
                    <Link href="/admin/billing" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-shadow shadow-lg flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="animate-spin" />}
                        Save Changes
                    </button>
                </div>

            </form>
        </div>
    );
}
