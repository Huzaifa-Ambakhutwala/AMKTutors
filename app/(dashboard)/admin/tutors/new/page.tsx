"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid'; // Standard uuid is good, but for client-side random string let's just use simple random

export default function AddTutorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subjects, setSubjects] = useState("");

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

            // Simpler Approach for this MVP:
            // Create a doc with a generated placeholder ID. 
            // NOTE: This won't link to their real Auth UID unless we update it later (like we do in Seed tool).
            const placeholderUid = `tutor-${Date.now()}`;

            await setDoc(doc(db, "users", placeholderUid), {
                uid: placeholderUid,
                name,
                email,
                role: 'TUTOR',
                subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
                isActive: true,
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
