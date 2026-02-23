"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRole } from "@/hooks/useUserRole";
import { Invoice } from "@/lib/types";
import { Loader2, ArrowLeft, FileText, DollarSign, CreditCard } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function ParentInvoicesPage() {
    const searchParams = useSearchParams();
    const { profileId, loading: roleLoading } = useUserRole();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<string | null>(null);

    useEffect(() => {
        if (!profileId || roleLoading) return;
        const q = query(collection(db, "invoices"), where("parentId", "==", profileId));
        getDocs(q)
            .then((snap) => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
                list.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
                setInvoices(list);
            })
            .catch((e) => console.error("Error fetching invoices:", e))
            .finally(() => setLoading(false));
    }, [profileId, roleLoading]);

    useEffect(() => {
        if (searchParams.get("paid") === "1") {
            toast.success("Payment successful. Thank you!");
            window.history.replaceState({}, "", "/parent/invoices");
        }
    }, [searchParams]);

    const handlePay = async (inv: Invoice) => {
        if (inv.status === "Paid") return;
        setPayingId(inv.id);
        try {
            const base = typeof window !== "undefined" ? window.location.origin : "";
            const res = await fetch("/api/payments/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    successUrl: `${base}/parent/invoices?paid=1`,
                    cancelUrl: `${base}/parent/invoices`,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to start payment");
            if (data.url) window.location.href = data.url;
            else toast.error("No payment URL returned");
        } catch (e: unknown) {
            toast.error((e as Error).message || "Payment failed");
        } finally {
            setPayingId(null);
        }
    };

    return (
        <RoleGuard allowedRoles={["PARENT"]}>
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/parent"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">My Invoices</h1>
                </div>
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                        <p className="text-gray-500">No invoices yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Invoices will appear here when sent by AMK Tutors.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {invoices.map((inv) => (
                            <div
                                key={inv.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileText className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{inv.invoiceNumber}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(inv.issueDate).toLocaleDateString()} – Due {new Date(inv.dueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <p className="text-lg font-bold text-gray-900">
                                        <DollarSign className="inline" size={20} />
                                        {inv.totalAmount.toFixed(2)}
                                    </p>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            inv.status === "Paid"
                                                ? "bg-green-100 text-green-700"
                                                : inv.status === "Overdue"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {inv.status}
                                    </span>
                                    {inv.status !== "Paid" && inv.status !== "Draft" && (
                                        <button
                                            onClick={() => handlePay(inv)}
                                            disabled={!!payingId}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {payingId === inv.id ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                                            Pay now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
