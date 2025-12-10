"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Lock, Phone, DollarSign } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid'; // Standard uuid is good, but for client-side random string let's just use simple random

export default function AddTutorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subjects, setSubjects] = useState("");
    const [phone, setPhone] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [hourlyPayRate, setHourlyPayRate] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Create a User Profile Document
            // Since we can't create Auth User, we create the profile and invite them to Sign Up using this email.
            // We need a stable ID. For now we can use a placeholder, or ask user to Sign Up first.
            // STRATEGY: Create doc with ID = email (sanitized) or random. 
            // Better: Use random ID, and when they sign up, we might need to migrate/merge?
            // OR: Just tell Admin: "Have the tutor sign up first, then find them here."

            // Create a doc with a generated placeholder ID. 
            // NOTE: This won't link to their real Auth UID unless we update it later (like we do in Seed tool).
            const placeholderUid = `tutor-${Date.now()}`;
            const inviteToken = uuidv4();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await setDoc(doc(db, "users", placeholderUid), {
                uid: placeholderUid,
                name,
                email,
                role: 'TUTOR',
                subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
                phone,
                adminNotes,
                hourlyPayRate: hourlyPayRate ? parseFloat(hourlyPayRate) : null,
                isActive: true,
                status: 'invited',
                inviteToken: inviteToken,
                inviteExpiresAt: expiresAt.toISOString(),
                authUid: null,
                createdAt: new Date().toISOString()
            });

            router.push("/admin/tutors");
        } catch (e) {
            alert("Error adding tutor");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-2xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/tutors" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Add New Tutor</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800 mb-6">
                        <strong>Note:</strong> This creates a Tutor profile in the system. The Tutor will still need to separate <strong>Sign Up</strong> with this email address, and verify their role.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            required type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            required type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
                        <input
                            type="text" value={subjects} onChange={e => setSubjects(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            placeholder="Math, Physics, English"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Lock size={18} className="text-gray-400" /> Contact & Admin Info
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2">Private to Admin</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Phone size={14} className="text-gray-400" /> Phone Number
                                </label>
                                <input
                                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <DollarSign size={14} className="text-gray-400" /> Hourly Pay Rate ($)
                                </label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={hourlyPayRate} onChange={e => setHourlyPayRate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (Private)</label>
                                <textarea
                                    value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[100px]"
                                    placeholder="Internal notes about this tutor..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <Link href="/admin/tutors" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </RoleGuard>
    );
}
