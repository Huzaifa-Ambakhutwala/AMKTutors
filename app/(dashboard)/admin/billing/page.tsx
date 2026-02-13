"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { FileText, DollarSign, Settings, Plus } from "lucide-react";
import Link from "next/link";
import ParentsInvoiceTab from "./components/ParentsInvoiceTab";
import TutorsPayTab from "./components/TutorsPayTab";
import BillingSettings from "./components/BillingSettings";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function BillingPage() {
    const [activeTab, setActiveTab] = useState<'INVOICE' | 'PAY' | 'SETTINGS'>('INVOICE');
    const isMobile = useIsMobile();

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold font-heading mb-6 md:mb-8">Billing & Payroll</h1>

                {/* Tabs - mobile: full-width, min-h 48px, no horizontal scroll */}
                <div className="flex border-b border-gray-200 overflow-x-auto min-h-[48px] -mx-4 px-4 md:mx-0 md:px-0">
                    <button
                        onClick={() => setActiveTab('INVOICE')}
                        className={`flex-1 md:flex-none min-h-[48px] px-4 flex items-center justify-center gap-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'INVOICE'
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <FileText size={18} /> <span className="hidden md:inline">Parents Invoice</span><span className="md:hidden">Invoice</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('PAY')}
                        className={`flex-1 md:flex-none min-h-[48px] px-4 flex items-center justify-center gap-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'PAY'
                            ? "text-green-600 border-b-2 border-green-600"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <DollarSign size={18} /> <span className="hidden md:inline">Tutors Pay</span><span className="md:hidden">Pay</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('SETTINGS')}
                        className={`flex-1 md:flex-none min-h-[48px] px-4 flex items-center justify-center gap-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'SETTINGS'
                            ? "text-gray-900 border-b-2 border-gray-900"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <Settings size={18} /> Settings
                    </button>
                </div>

                <div className="mt-6 pb-24 md:pb-0">
                    {activeTab === 'INVOICE' && <ParentsInvoiceTab />}
                    {activeTab === 'PAY' && <TutorsPayTab />}
                    {activeTab === 'SETTINGS' && <BillingSettings />}
                </div>

                {/* Sticky bottom action bar - Create Invoice (mobile, Invoice tab only) */}
                {isMobile && activeTab === 'INVOICE' && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg safe-area-pb p-4 flex justify-center">
                        <Link
                            href="/admin/billing/new"
                            className="w-full max-w-md bg-primary text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 min-h-[48px]"
                        >
                            <Plus size={20} /> Create Invoice
                        </Link>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
