"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Invoice, UserProfile } from "@/lib/types";
import { Loader2, Printer, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const invoiceId = id as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [parent, setParent] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const invDoc = await getDoc(doc(db, "invoices", invoiceId));
                if (invDoc.exists()) {
                    const invData = { id: invDoc.id, ...invDoc.data() } as Invoice;
                    setInvoice(invData);

                    // Fetch Parent Details (Address etc)
                    if (invData.parentId) {
                        const pDoc = await getDoc(doc(db, "users", invData.parentId));
                        if (pDoc.exists()) {
                            setParent(pDoc.data() as UserProfile);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [invoiceId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
    if (!invoice) return <div className="p-20 text-center">Invoice not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">

            {/* Action Bar - Hidden on Print */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
                <Link href="/admin/billing" className="text-gray-500 hover:text-gray-900 flex items-center gap-2">
                    <ArrowLeft size={20} /> Back to Billing
                </Link>
                <button
                    onClick={handlePrint}
                    className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg"
                >
                    <Printer size={20} /> Print / Save PDF
                </button>
            </div>

            {/* Invoice Document - Matches Canva Design */}
            <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none print:w-full print:max-w-none min-h-[1000px] relative">

                {/* Header Section */}
                <div className="p-12 pb-0">
                    {/* Logo Area */}
                    <div className="w-48 mb-6">
                        <div className="relative w-40 h-24 mb-2">
                            <Image src="/logo.png" alt="AMK Tutors" fill className="object-contain object-left" />
                        </div>
                    </div>

                    {/* Yellow Invoice Title Block - Matches Image */}
                    <div className="bg-[#FFEB3B] py-2 px-8 inline-block mb-12">
                        <h1 className="text-2xl font-medium tracking-widest text-gray-900 uppercase">INVOICE</h1>
                    </div>
                </div>

                {/* Info Grid - Fixed Spacing */}
                <div className="px-12 flex justify-between items-start mb-12">
                    <div className="w-1/2 pr-8">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Invoice to:</h3>
                        <p className="text-lg font-bold text-black mb-1">{invoice.parentName}</p>
                        {parent?.address && (
                            <p className="text-gray-600 whitespace-pre-line text-sm">{parent.address}</p>
                        )}
                        <p className="text-gray-600 mt-1 text-sm">{parent?.email}</p>
                    </div>
                    <div className="w-1/2 text-right space-y-2">
                        <div className="flex justify-end items-center gap-12">
                            <span className="text-sm font-bold text-gray-900 w-24 text-left">Invoice#</span>
                            <span className="text-lg text-gray-600 font-medium w-24 text-right">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-end items-center gap-12">
                            <span className="text-sm font-bold text-gray-900 w-24 text-left">Date</span>
                            <span className="text-lg text-gray-600 font-medium w-24 text-right">{new Date(invoice.issueDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>


                {/* Items Table */}
                <div className="px-12 mb-12">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border border-gray-400 p-3 text-left font-bold text-gray-900 w-3/4">Service</th>
                                <th className="border border-gray-400 p-3 text-center font-bold text-gray-900 w-1/4">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td className="border border-gray-400 p-4 text-gray-800">
                                        {item.description}
                                        {/* Optional: Show detail like "10 hrs @ $50/hr" if created that way */}
                                        {(item.quantity > 1 || item.rate > 0) && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {item.quantity} x ${item.rate}/hr
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-gray-400 p-4 text-center text-gray-800 font-medium">
                                        ${item.total.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr>
                                <td className="border border-gray-400 p-4 text-right">
                                    {/* Empty cell for layout */}
                                </td>
                                <td className="border border-gray-400 p-4 text-center font-black text-2xl text-gray-900">
                                    ${invoice.totalAmount.toFixed(0)}$
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer / Payment Info */}
                <div className="px-12 mt-auto pb-12">
                    <h3 className="text-xl font-bold text-gray-900 uppercase mb-4">Payment Method</h3>
                    <div className="text-gray-800 text-lg leading-relaxed">
                        <p>Cash or</p>
                        <p>Zelle : +1 (281) 919-9937</p>
                        <p>Pay by: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>

                    <div className="mt-16 text-right text-gray-600 text-sm">
                        <p>For any inquiries please reach out at:</p>
                        <p className="font-medium text-gray-900">Tutoring.amk@gmail.com</p>
                    </div>
                </div>

            </div>

            {/* Print Styles helper */}
            <style jsx global>{`
            @media print {
                @page { margin: 0; size: auto; }
                body { 
                    visibility: hidden; 
                    background: white;
                }
                
                /* Hide sidebar and layout elements */
                nav, aside, header, .print\\:hidden, button { 
                    display: none !important; 
                }

                /* Show only the invoice container */
                .max-w-4xl.bg-white {
                    visibility: visible;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    max-width: none !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                }
                
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        `}</style>
        </div>
    );
}
