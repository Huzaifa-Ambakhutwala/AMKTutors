"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, InvoiceItem } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateInvoicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Data
    const [parents, setParents] = useState<UserProfile[]>([]);

    // Form State
    const [selectedParentId, setSelectedParentId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("0001");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");

    const [items, setItems] = useState<InvoiceItem[]>([
        { description: "Tutoring Services", quantity: 1, rate: 50, total: 50 }
    ]);

    useEffect(() => {
        async function fetchParents() {
            const snap = await getDocs(collection(db, "users"));
            const parentList = snap.docs
                .map(d => d.data() as UserProfile)
                .filter(u => u.role === 'PARENT');
            setParents(parentList);

            // Auto-generate invoice number (Mocking sequence)
            setInvoiceNumber(String(Math.floor(1000 + Math.random() * 9000)));
        }
        fetchParents();
    }, []);

    // Update totals when Qty/Rate change
    const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
        const newItems = [...items];
        const item = { ...newItems[index] };

        if (field === 'description') {
            item.description = value as string;
        } else {
            // Handle numeric updates
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
            toast.warning("Please select a parent");
            return;
        }
        setLoading(true);

        try {
            const parent = parents.find(p => p.uid === selectedParentId);

            await addDoc(collection(db, "invoices"), {
                parentId: selectedParentId,
                parentName: parent?.name || "Unknown",
                invoiceNumber,
                issueDate,
                dueDate: dueDate || issueDate, // Default same day if empty
                status: 'Pending', // Default to Pending until sent
                items,
                totalAmount: calculateGrandTotal(),
                periodStart: issueDate, // Placeholder
                periodEnd: issueDate,   // Placeholder
                createdAt: new Date().toISOString()
            });

            router.push("/admin/billing");
        } catch (e) {
            console.error(e);
            toast.error("Error creating invoice");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none";
    return (
        <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
            <div className="mb-6 md:mb-8 flex items-center gap-4">
                <Link href="/admin/billing" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold font-heading">New Invoice</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-200">

                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Bill To (Parent)</label>
                        <select
                            required
                            value={selectedParentId}
                            onChange={e => setSelectedParentId(e.target.value)}
                            className={inputClass}
                        >
                            <option value="">Select Parent...</option>
                            {parents.map(p => (
                                <option key={p.uid} value={p.uid}>{p.name} ({p.email})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Invoice #</label>
                            <input
                                type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                                className={`${inputClass} font-mono`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Issue Date</label>
                            <input
                                type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                            <input
                                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className={inputClass}
                            />
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
                            <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:items-end border border-gray-100 rounded-xl p-4">
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                        className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Service description..."
                                    />
                                </div>
                                <div className="flex gap-3 items-end">
                                    <div className="w-20 sm:w-20">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                                        <input
                                            type="number" min="0" inputMode="numeric"
                                            value={item.quantity}
                                            onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                            className="w-full px-3 py-3 min-h-[48px] border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Rate ($)</label>
                                        <input
                                            type="number" min="0" step="0.01" inputMode="decimal"
                                            value={item.rate}
                                            onChange={e => updateItem(idx, 'rate', e.target.value)}
                                            className="w-full px-3 py-3 min-h-[48px] border border-gray-300 rounded-xl text-right focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pb-1">
                                        <span className="font-mono font-bold text-gray-700">${(item.total).toFixed(2)}</span>
                                        <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:text-red-600 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl hover:bg-red-50">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
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

                {/* Actions - sticky on mobile */}
                <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 left-0 right-0 bg-white py-4 border-t border-gray-100 -mx-4 px-4 md:mx-0 md:px-0 safe-area-pb">
                    <Link href="/admin/billing" className="px-6 py-3 min-h-[48px] border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 min-h-[48px] bg-primary text-white rounded-xl font-bold hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" />}
                        Create Invoice
                    </button>
                </div>

            </form>
        </div>
    );
}
