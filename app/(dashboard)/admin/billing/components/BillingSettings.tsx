"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Save, Mail, FileText, DollarSign } from "lucide-react";

export default function BillingSettings() {
    const [loading, setLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'INVOICE' | 'EMAIL' | 'PAYSTUB'>('INVOICE');
    const [saving, setSaving] = useState(false);

    // Email State
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    // Invoice State
    const [companyName, setCompanyName] = useState("AMK Tutors");
    const [addressLine1, setAddressLine1] = useState("123 Education Street");
    const [addressLine2, setAddressLine2] = useState("Learning City, ST 12345");
    const [contactEmail, setContactEmail] = useState("contact@amktutors.com");
    const [contactPhone, setContactPhone] = useState("(555) 123-4567");
    const [footerNotes, setFooterNotes] = useState("Please make checks payable to \"AMK Tutors\". Payment is due within 7 days.\nThank you for your business!");

    // Pay Stub State
    const [payStubFooter, setPayStubFooter] = useState("Earnings Statement.\nThank you for your hard work!");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, "settings", "email_templates"));
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Email
                const emailData = data.invoice || {};
                setSubject(emailData.subject || "Invoice #{{invoiceNumber}} from AMK Tutors");
                const savedBody = emailData.body;
                const defaultBody = `Dear {{parentName}},

Please find attached the invoice #{{invoiceNumber}} for {{amount}}.

Issue Date: {{date}}

You can view and pay your invoice securely by clicking the link below:
{{link}}

Thank you,
AMK Tutors`;

                // Use saved body if it exists and isn't the old HTML default, otherwise use new plain text default
                setBody((savedBody && !savedBody.trim().startsWith("<div")) ? savedBody : defaultBody);

                // Invoice
                const invData = data.invoice_layout || {};
                setCompanyName(invData.companyName || "AMK Tutors");
                setAddressLine1(invData.addressLine1 || "123 Education Street");
                setAddressLine2(invData.addressLine2 || "Learning City, ST 12345");
                setContactEmail(invData.contactEmail || "contact@amktutors.com");
                setContactPhone(invData.contactPhone || "(555) 123-4567");
                setFooterNotes(invData.footerNotes || "Please make checks payable to \"AMK Tutors\". Payment is due within 7 days.\nThank you for your business!");

                // Pay Stub
                const stubData = data.pay_stub_layout || {};
                setPayStubFooter(stubData.footerNotes || "Earnings Statement.\nThank you for your hard work!");
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "settings", "email_templates"), {
                invoice: { subject, body },
                invoice_layout: {
                    companyName,
                    addressLine1,
                    addressLine2,
                    contactEmail,
                    contactPhone,
                    footerNotes
                },
                pay_stub_layout: {
                    footerNotes: payStubFooter
                }
            }, { merge: true });
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div><Loader2 className="animate-spin" /> Loading Settings...</div>;

    return (
        <div className="space-y-6 max-w-4xl">

            {/* Sub Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveSubTab('INVOICE')}
                    className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeSubTab === 'INVOICE' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText size={18} /> Invoice Layout
                </button>
                <button
                    onClick={() => setActiveSubTab('PAYSTUB')}
                    className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeSubTab === 'PAYSTUB' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <DollarSign size={18} /> Pay Stub Layout
                </button>
                <button
                    onClick={() => setActiveSubTab('EMAIL')}
                    className={`pb-3 px-2 flex items-center gap-2 font-medium transition-colors border-b-2 ${activeSubTab === 'EMAIL' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Mail size={18} /> Email Template
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                {activeSubTab === 'INVOICE' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h3 className="font-bold text-lg mb-4">Invoice PDF/Print Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                <input type="text" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                <input type="text" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                                <input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                                <input type="text" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Footer / Payment Instructions</label>
                            <textarea
                                value={footerNotes}
                                onChange={e => setFooterNotes(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg h-32"
                            />
                        </div>
                    </div>
                )}

                {activeSubTab === 'EMAIL' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h3 className="font-bold text-lg mb-4">Email Notification Template</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg h-48 text-sm"
                                placeholder="Write your email message here..."
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Available placeholders: {"{{parentName}}"}, {"{{invoiceNumber}}"}, {"{{amount}}"}, {"{{date}}"}, {"{{link}}"}
                            </p>
                        </div>
                    </div>
                )}

                {activeSubTab === 'PAYSTUB' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h3 className="font-bold text-lg mb-4">Pay Stub Layout</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Customize the layout for tutor pay stubs. Company details are shared with the Invoice Layout.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Default Footer / Notes</label>
                            <textarea
                                value={payStubFooter}
                                onChange={(e) => setPayStubFooter(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg h-32"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end mt-8 border-t border-gray-100 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
