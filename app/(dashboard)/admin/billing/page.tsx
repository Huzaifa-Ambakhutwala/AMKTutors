"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice } from "@/lib/types";
import { Loader2, FileText, Plus, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function InvoicesListPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchInvoices() {
            try {
                const q = query(collection(db, "invoices")); // Add orderBy in real app
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
                // Client side sort for MVP
                data.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
                setInvoices(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchInvoices();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this invoice?")) return;
        try {
            await deleteDoc(doc(db, "invoices", id));
            setInvoices(invoices.filter(i => i.id !== id));
        } catch (e) {
            alert("Error deleting invoice");
            console.error(e);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-heading">Invoices</h1>
                <Link href="/admin/billing/new" className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <Plus size={18} /> Create Invoice
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Invoice #</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Parent</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Date Issued</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Due Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-600">#{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{inv.parentName}</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">${inv.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                            inv.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <Link href={`/admin/billing/${inv.id}`} className="text-gray-500 hover:text-blue-600 flex items-center gap-1" title="View / Print">
                                            <Eye size={18} />
                                        </Link>
                                        <Link href={`/admin/billing/${inv.id}/edit`} className="text-gray-500 hover:text-orange-500 flex items-center gap-1" title="Edit">
                                            <Edit size={18} />
                                        </Link>
                                        <button onClick={() => handleDelete(inv.id)} className="text-gray-500 hover:text-red-500 flex items-center gap-1" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No invoices generated yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
