"use client";

import { PayStub } from "@/lib/types";
import { X, Printer, Loader2, Download } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PayStubViewerProps {
    payStub: PayStub;
    onClose: () => void;
}

export default function PayStubViewer({ payStub, onClose }: PayStubViewerProps) {
    const [downloading, setDownloading] = useState(false);
    const [settings, setSettings] = useState<any>({});
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
                        // Keep company info from invoice layout unless overridden
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

        const canvas = await html2canvas(element, {
            scale: 1.5,
            backgroundColor: "#ffffff",
            useCORS: true
        } as any);

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
            pdf.save(`PayStub-${payStub.tutorName}-${new Date(payStub.issueDate).toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("Error generating PDF:", e);
            alert("Failed to generate PDF");
        } finally {
            setDownloading(false);
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
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 no-print">
                    <h2 className="font-bold text-lg text-gray-700">Preview Pay Stub</h2>
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
                            onClick={onClose}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div className="flex-1 overflow-y-auto p-12 print:overflow-visible print:p-0" id="paystub-content">
                    <div className="max-w-3xl mx-auto print:w-full print:max-w-none">

                        {/* Company Header */}
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <div className="relative w-40 h-20 mb-4">
                                    <img src="/logo.png" alt="AMK Tutors" className="w-24 h-24 object-contain" />
                                </div>
                                <h1 className="text-4xl font-bold font-heading mb-2 text-green-700">PAY STUB</h1>
                                <p className="font-medium text-gray-500">{new Date(payStub.issueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right text-gray-600">
                                <h3 className="font-bold text-xl mb-2 text-gray-900">{companyName}</h3>
                                <p>{addressLine1}</p>
                                <p>{addressLine2}</p>
                                <p>{contactEmail}</p>
                                <p>{contactPhone}</p>
                            </div>
                        </div>

                        {/* Pay To Details */}
                        <div className="flex justify-between mb-12 bg-gray-50 p-6 rounded-lg border border-gray-100 print:bg-transparent print:border-none print:p-0">
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider mb-2 text-gray-500">Pay To</h4>
                                <p className="text-xl font-bold text-gray-900">{payStub.tutorName}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium text-gray-500">Pay Date:</span>
                                    <span className="font-bold text-gray-900">{new Date(payStub.issueDate).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between gap-8">
                                    <span className="text-sm font-medium text-gray-500">Total Hours:</span>
                                    <span className="font-bold text-gray-900">{payStub.totalHours.toFixed(2)} hrs</span>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-8">
                            <thead>
                                <tr className="border-b-2 border-gray-900">
                                    <th className="py-3 text-left font-bold text-gray-900 w-1/3">Date / Service</th>
                                    <th className="py-3 text-left font-bold text-gray-900">Details</th>
                                    <th className="py-3 text-center font-bold text-gray-900">Hrs</th>
                                    <th className="py-3 text-right font-bold text-gray-900">Rate</th>
                                    <th className="py-3 text-right font-bold text-gray-900">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payStub.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100">
                                        <td className="py-4">
                                            <div className="font-bold text-gray-900">{new Date(item.date).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{item.subject}</div>
                                        </td>
                                        <td className="py-4">
                                            <div className="text-sm text-gray-700">{item.studentName ? `Student: ${item.studentName}` : "Session"}</div>
                                        </td>
                                        <td className="py-4 text-center text-gray-700">{item.durationHours.toFixed(2)}</td>
                                        <td className="py-4 text-right text-gray-700">${item.hourlyRate.toFixed(2)}</td>
                                        <td className="py-4 text-right font-bold text-gray-900">${item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-1/2 space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-200">
                                    <span className="font-medium text-gray-600">Gross Pay</span>
                                    <span className="font-bold text-gray-900">${payStub.totalPay.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b-2 border-green-600 bg-green-50 px-2 print:bg-transparent print:px-0">
                                    <span className="text-xl font-bold text-gray-900">Net Pay</span>
                                    <span className="text-xl font-bold text-green-700">${payStub.totalPay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="rounded-lg p-6 bg-gray-50 border border-gray-200 print:bg-transparent">
                            <h4 className="font-bold mb-2 text-gray-900">Notes</h4>
                            {payStub.notes && <p className="mb-4 whitespace-pre-wrap text-gray-600">{payStub.notes}</p>}
                            <p className="text-sm whitespace-pre-wrap text-gray-500 border-t pt-4">
                                {footerNotes}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
