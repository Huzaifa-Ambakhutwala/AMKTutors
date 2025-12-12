"use client";

import { PayStub } from "@/lib/types";
import { X, Loader2, Download, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PayStubViewerProps {
    payStub: PayStub;
    onClose: () => void;
}

export default function PayStubViewer({ payStub, onClose }: PayStubViewerProps) {
    const [downloading, setDownloading] = useState(false);
    const [emailing, setEmailing] = useState(false);
    const [settings, setSettings] = useState<any>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch shared settings
                const snap = await getDoc(doc(db, "settings", "email_templates"));
                if (snap.exists()) {
                    const data = snap.data();
                    // Merge invoice layout (company info) with pay stub specific footer if exists
                    const invLayout = data.invoice_layout || {};
                    const stubLayout = data.pay_stub_layout || {};

                    setSettings({
                        ...invLayout,
                        footerNotes: stubLayout.footerNotes || "Earnings Statement.\nThank you for your hard work!",
                    });
                }
            } catch (e) {
                console.error("Error loading settings", e);
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const generatePdf = async () => {
        const element = document.getElementById("paystub-content");
        if (!element) throw new Error("Could not find content to generate PDF");

        // Fixed html2canvas config to avoid 'lab' color crashes and type errors
        const canvas = await html2canvas(element, {
            scale: 2, // Slightly higher scale for better quality
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            scrollY: 0, // Critical: Prevent scroll position from cutting off top
            windowHeight: element.scrollHeight + 100, // Ensure full height is captured
            // @ts-ignore
        } as any);

        const imgData = canvas.toDataURL("image/jpeg", 0.8);
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Add a small top margin (10mm) to avoid cutting off at the printer edge
        const topMargin = 10;
        pdf.addImage(imgData, "JPEG", 0, topMargin, pdfWidth, pdfHeight);
        return pdf;
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const pdf = await generatePdf();
            pdf.save(`PayStub-${payStub.tutorName.replace(/\s+/g, '_')}-${new Date(payStub.issueDate).toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("Error generating PDF:", e);
            alert("Failed to generate PDF. If using dark mode or specific colors, try standard theme.");
        } finally {
            setDownloading(false);
        }
    };

    const handleEmail = async () => {
        if (!confirm(`Send this pay stub to ${payStub.tutorName}?`)) return;
        setEmailing(true);
        try {
            const pdf = await generatePdf();
            const pdfBase64 = pdf.output('datauristring');

            // Fetch tutor email
            const tutorDoc = await getDoc(doc(db, "users", payStub.tutorId));
            const tutorEmail = tutorDoc.exists() ? tutorDoc.data().email : null;

            if (!tutorEmail) {
                alert("Could not find tutor email.");
                return;
            }

            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/email/pay-stub', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: tutorEmail,
                    tutorName: payStub.tutorName,
                    periodStart: new Date(payStub.periodStart).toLocaleDateString(),
                    periodEnd: new Date(payStub.periodEnd).toLocaleDateString(),
                    totalPay: payStub.totalPay,
                    pdfBase64: pdfBase64,
                    filename: `PayStub-${payStub.tutorName.replace(/\s+/g, '_')}.pdf`
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Server failed to send");
            }

            alert("Pay Stub sent successfully!");
        } catch (e: any) {
            console.error(e);
            alert(`Failed to send email: ${e.message}`);
        } finally {
            setEmailing(false);
        }
    };

    const {
        companyName = "AMK Tutors",
        addressLine1 = "123 Education Street",
        addressLine2 = "Learning City, ST 12345",
        contactEmail = "contact@amktutors.com",
        contactPhone = "(555) 123-4567",
        footerNotes = "Earnings Statement.\nThank you for your hard work!"
    } = settings;

    return (
        <div id="paystub-print-wrapper" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <style>
                {`
@media print {
    @page { margin: 0; }
    body * {
        visibility: hidden;
    }
    #paystub-print-wrapper, #paystub-print-wrapper * {
        visibility: visible;
    }
    #paystub-print-wrapper {
        position: absolute;
        left: 0;
        top: 0;
        width: 100vw;
        height: 100%;
        padding: 40px;
        margin: 0;
        background: white;
        z-index: 9999;
    }
    .no-print {
        display: none!important;
    }
    #paystub-content {
        width: 100%;
        max-width: none;
        overflow: visible;
    }
}
`}
            </style>
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:shadow-none print:h-auto print:w-full print:max-w-none print:rounded-none">

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-b border-gray-100 bg-gray-50 no-print">
                    <h2 className="font-bold text-lg text-gray-700">Preview Pay Stub</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleEmail}
                            disabled={emailing || downloading}
                            className="flex items-center gap-2 bg-blue-600 border border-transparent px-4 py-2 rounded-lg text-white hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {emailing ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                            Email Tutor
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={downloading || emailing}
                            className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                        >
                            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            Download PDF
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
                <div className="flex-1 overflow-y-auto p-4 md:p-12 print:overflow-visible print:p-0" id="paystub-content">
                    <div className="max-w-3xl mx-auto print:w-full print:max-w-none">

                        {/* Company Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <div className="relative w-40 h-20 mb-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/logo.png" alt="AMK Tutors" className="w-24 h-24 object-contain" />
                                </div>
                                <h1 className="text-4xl font-bold font-heading mb-2" style={{ color: '#15803d' }}>PAY STUB</h1>
                                <p className="font-bold text-lg mb-1" style={{ color: '#374151' }}>{payStub.payStubNumber || "PAY-" + payStub.id.slice(0, 6)}</p>
                                <p className="font-medium" style={{ color: '#6b7280' }}>{new Date(payStub.issueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right" style={{ color: '#4b5563' }}>
                                <h3 className="font-bold text-xl mb-2" style={{ color: '#111827' }}>{companyName}</h3>
                                <p>{addressLine1}</p>
                                <p>{addressLine2}</p>
                                <p>{contactEmail}</p>
                                <p>{contactPhone}</p>
                            </div>
                        </div>

                        {/* Pay To Details */}
                        <div className="flex justify-between mb-12 p-6 rounded-lg border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Pay To</h4>
                                <p className="text-xl font-bold" style={{ color: '#111827' }}>{payStub.tutorName}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Pay Date:</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>{new Date(payStub.issueDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Total Hours:</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>{payStub.totalHours.toFixed(2)} hrs</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full mb-8 min-w-[500px]">
                                <thead>
                                    <tr className="border-b-2" style={{ borderColor: '#111827' }}>
                                        <th className="py-3 text-left font-bold w-1/3" style={{ color: '#111827' }}>Date / Service</th>
                                        <th className="py-3 text-left font-bold" style={{ color: '#111827' }}>Details</th>
                                        <th className="py-3 text-center font-bold" style={{ color: '#111827' }}>Hrs</th>
                                        <th className="py-3 text-right font-bold" style={{ color: '#111827' }}>Rate</th>
                                        <th className="py-3 text-right font-bold" style={{ color: '#111827' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payStub.items.map((item, idx) => (
                                        <tr key={idx} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                                            <td className="py-4">
                                                <div className="font-bold" style={{ color: '#111827' }}>{new Date(item.date).toLocaleDateString()}</div>
                                                <div className="text-xs" style={{ color: '#6b7280' }}>{item.subject}</div>
                                            </td>
                                            <td className="py-4">
                                                <div className="text-sm" style={{ color: '#374151' }}>{item.studentName ? `Student: ${item.studentName}` : "Session"}</div>
                                            </td>
                                            <td className="py-4 text-center" style={{ color: '#374151' }}>{item.durationHours.toFixed(2)}</td>
                                            <td className="py-4 text-right" style={{ color: '#374151' }}>${item.hourlyRate.toFixed(2)}</td>
                                            <td className="py-4 text-right font-bold" style={{ color: '#111827' }}>${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-1/2 space-y-3">
                                <div className="flex justify-between py-2 border-b" style={{ borderColor: '#e5e7eb' }}>
                                    <span className="font-medium" style={{ color: '#4b5563' }}>Gross Pay</span>
                                    <span className="font-bold" style={{ color: '#111827' }}>${payStub.totalPay.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b-2 px-2" style={{ borderColor: '#16a34a', backgroundColor: '#f0fdf4' }}>
                                    <span className="text-xl font-bold" style={{ color: '#111827' }}>Net Pay</span>
                                    <span className="text-xl font-bold" style={{ color: '#15803d' }}>${payStub.totalPay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="rounded-lg p-6 border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                            <h4 className="font-bold mb-2" style={{ color: '#111827' }}>Notes</h4>
                            {payStub.notes && <p className="mb-4 whitespace-pre-wrap" style={{ color: '#4b5563' }}>{payStub.notes}</p>}
                            <p className="text-sm whitespace-pre-wrap border-t pt-4" style={{ color: '#6b7280', borderColor: '#e5e7eb' }}>
                                {footerNotes}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
