"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { FileText, DollarSign } from "lucide-react";
import ParentsInvoiceTab from "./components/ParentsInvoiceTab";
import TutorsPayTab from "./components/TutorsPayTab";

export default function BillingPage() {
    const [activeTab, setActiveTab] = useState<'INVOICE' | 'PAY'>('INVOICE');

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <h1 className="text-3xl font-bold font-heading mb-8">Billing & Payroll</h1>

                <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('INVOICE')}
                        className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'INVOICE'
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <FileText size={18} /> Parents Invoice
                    </button>
                    <button
                        onClick={() => setActiveTab('PAY')}
                        className={`pb-3 px-4 flex items-center gap-2 font-medium transition-colors relative ${activeTab === 'PAY'
                                ? "text-green-600 border-b-2 border-green-600"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <DollarSign size={18} /> Tutors Pay
                    </button>
                </div>

                <div className="mt-6">
                    {activeTab === 'INVOICE' ? <ParentsInvoiceTab /> : <TutorsPayTab />}
                </div>
            </div>
        </RoleGuard>
    );
}
