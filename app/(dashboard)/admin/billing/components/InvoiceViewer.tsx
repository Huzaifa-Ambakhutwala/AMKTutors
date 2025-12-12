"use client";

import { Invoice } from "@/lib/types";
import { X, Printer, Mail, Loader2, Download } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface InvoiceViewerProps {
    invoice: Invoice;
    onClose: () => void;
    onUpdate?: () => void; // Optional callback to refresh parent
}

export default function InvoiceViewer({ invoice, onClose, onUpdate }: InvoiceViewerProps) {
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [status, setStatus] = useState(invoice.status || 'Pending');
    const [settings, setSettings] = useState<any>({});
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const snap = await getDoc(doc(db, "settings", "email_templates"));
                if (snap.exists()) {
                    setSettings(snap.data().invoice_layout || {});
                }
            } catch (e) {
                console.error("Error loading invoice settings", e);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const handleStatusChange = async (newStatus: string) => {
        try {
            await updateDoc(doc(db, "invoices", invoice.id), {
                status: newStatus
            });
            setStatus(newStatus as any);
            if (onUpdate) onUpdate();
        } catch (e) {
            console.error("Error updating status:", e);
            alert("Failed to update status");
        }
    };

    const generatePdf = async () => {
        const element = document.getElementById("invoice-content");
        if (!element) throw new Error("Could not find invoice content to generate PDF");

        const canvas = await html2canvas(element, {
            scale: 1.5, // Reduced from 2 to 1.5 for smaller size
            backgroundColor: "#ffffff",
            useCORS: true
        } as any);

        // Use JPEG with 0.75 quality instead of PNG
        const imgData = canvas.toDataURL("image/jpeg", 0.75);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
        return pdf;
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const pdf = await generatePdf();
            pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
        } catch (e) {
            console.error("Error generating PDF:", e);
            alert("Failed to generate PDF");
        } finally {
            setDownloading(false);
        }
    };

    const handleEmail = async () => {
        if (!confirm(`Email this invoice to ${invoice.parentName}?`)) return;
        setSending(true);
        try {
            const pdf = await generatePdf();
            const pdfAttachment = pdf.output("datauristring");

            const res = await fetch("/api/email/invoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    parentId: invoice.parentId,
                    parentName: invoice.parentName,
                    invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount,
                    issueDate: invoice.issueDate,
                    pdfAttachment
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send email");

            alert("Invoice emailed successfully!");
            handleStatusChange('Sent'); // Auto-update to Sent
        } catch (e: any) {
            console.error("Error sending email:", e);
            alert(`Error: ${e.message}`);
        } finally {
            setSending(false);
        }
    };

    const {
        companyName = "AMK Tutors",
        addressLine1 = "123 Education Street",
        addressLine2 = "Learning City, ST 12345",
        contactEmail = "contact@amktutors.com",
        contactPhone = "(555) 123-4567",
        footerNotes = "Please make checks payable to \"AMK Tutors\". Payment is due within 7 days.\nThank you for your business!"
    } = settings;

    return (
        <div id="invoice-print-wrapper" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <style>
                {`
@media print {
    @page { margin: 0; }
    body * {
        visibility: hidden;
    }
    #invoice - print - wrapper, #invoice - print - wrapper * {
        visibility: visible;
    }
    #invoice - print - wrapper {
        position: absolute;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100 %;
        padding: 40px; /* Add padding since we removed page margins */
        margin: 0;
        background: white;
        z - index: 9999;
    }
                     /* Hide the header actions in print explicitly just in case */
                    .no - print {
        display: none!important;
    }
    #invoice - content {
        width: 100 %;
        max - width: none;
        overflow: visible;
    }
}
`}
            </style>
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:h-auto print:w-full print:max-w-none print:rounded-none">

                {/* Header Actions (Hidden in Print) */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-b border-gray-100 bg-gray-50 no-print">
                    <div className="flex items-center gap-4">
                        <h2 className="font-bold text-lg text-gray-700">Preview Invoice</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Status:</span>
                            <select
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`text-sm font-bold px-3 py-1 rounded-full border border-gray-300 outline-none cursor-pointer ${status === 'Paid' ? 'bg-green-100 text-green-700' :
                                    status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                        status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}
                            >
                                <option value="Pending">Pending</option>
                                <option value="Sent">Sent</option>
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                        >
                            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Download PDF
                        </button>
                        <button
                            onClick={handleEmail}
                            disabled={sending}
                            className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-lg text-white hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                            Email to Parent
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 print:overflow-visible print:p-0" id="invoice-content">
                    <div className="max-w-3xl mx-auto print:w-full print:max-w-none">

                        {/* Company Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <div className="relative w-40 h-20 mb-4">
                                    <img src="/logo.png" alt="AMK Tutors" className="w-24 h-24 object-contain" />
                                </div>
                                <h1 className="text-4xl font-bold font-heading mb-2" style={{ color: '#111827' }}>INVOICE</h1>
                                <p className="font-medium" style={{ color: '#6B7280' }}>#{invoice.invoiceNumber}</p>
                            </div>
                            <div className="text-right" style={{ color: '#4B5563' }}>
                                <h3 className="font-bold text-xl mb-2" style={{ color: '#111827' }}>{companyName}</h3>
                                <p>{addressLine1}</p>
                                <p>{addressLine2}</p>
                                <p>{contactEmail}</p>
                                <p>{contactPhone}</p>
                            </div>
                        </div>

                        {/* Bill To & Details */}
                        <div className="flex justify-between mb-12">
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Bill To</h4>
                                <p className="text-xl font-bold" style={{ color: '#111827' }}>{invoice.parentName}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Issue Date:</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium" style={{ color: '#6B7280' }}>Due Date:</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full mb-8 min-w-[500px]">
                                <thead>
                                    <tr className="border-b-2" style={{ borderColor: '#111827' }}>
                                        <th className="py-3 text-left font-bold w-1/2" style={{ color: '#111827' }}>Description</th>
                                        <th className="py-3 text-center font-bold" style={{ color: '#111827' }}>Hrs</th>
                                        <th className="py-3 text-right font-bold" style={{ color: '#111827' }}>Rate</th>
                                        <th className="py-3 text-right font-bold" style={{ color: '#111827' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                            <td className="py-4">
                                                <div className="font-bold" style={{ color: '#1F2937' }}>{item.description}</div>
                                                <div className="text-sm text-xs" style={{ color: '#6B7280' }}>
                                                    {item.studentName ? `Student: ${item.studentName} ` : ""}
                                                </div>
                                            </td>
                                            <td className="py-4 text-center" style={{ color: '#374151' }}>{item.quantity.toFixed(2)}</td>
                                            <td className="py-4 text-right" style={{ color: '#374151' }}>${item.rate.toFixed(2)}</td>
                                            <td className="py-4 text-right font-bold" style={{ color: '#111827' }}>${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-1/2 space-y-3">
                                <div className="flex justify-between py-2 border-b" style={{ borderColor: '#F3F4F6' }}>
                                    <span className="font-medium" style={{ color: '#4B5563' }}>Subtotal</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>${invoice.totalAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b-2" style={{ borderColor: '#111827' }}>
                                    <span className="text-xl font-bold" style={{ color: '#111827' }}>Total Due</span>
                                    <span className="text-xl font-bold" style={{ color: '#2563EB' }}>${invoice.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Payment Info */}
                        <div className="rounded-lg p-6 print:bg-transparent print:border" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
                            <h4 className="font-bold mb-2" style={{ color: '#111827' }}>Notes & Instructions</h4>
                            {invoice.notes && <p className="mb-4 whitespace-pre-wrap" style={{ color: '#4B5563' }}>{invoice.notes}</p>}
                            <p className="text-sm whitespace-pre-wrap" style={{ color: '#6B7280' }}>
                                {footerNotes}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

