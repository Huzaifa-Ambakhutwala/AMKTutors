"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, InvoiceItem } from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
            alert("Please select a parent");
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
            alert("Error creating invoice");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/admin/billing" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold font-heading">New Invoice</h1>
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
                        {/* Could Fetch/Show address details here */}
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
                                        placeholder="Service description..."
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
                        disabled={loading}
                        className="px-8 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 transition-shadow shadow-lg flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" />}
                        Create Invoice
                    </button>
                </div>

            </form>
        </div>
    );
}
