"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
// Using crypto.randomUUID if available or a simple fallback
const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `parent-${Date.now()}`;

export default function AddParentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Create Parent Profile with placeholder ID
            const uid = generateId();
            const inviteToken = generateId(); // Use same random gen for token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

            await setDoc(doc(db, "users", uid), {
                uid: uid,
                name,
                email,
                phone,
                address,
                role: 'PARENT',
                status: 'invited',
                inviteToken: inviteToken,
                inviteExpiresAt: expiresAt.toISOString(),
                authUid: null,
                createdAt: new Date().toISOString()
            });

            router.push("/admin/parents");
        } catch (e) {
            alert("Error adding parent");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none";
    return (
        <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="mb-6 md:mb-8 flex items-center gap-4">
                <Link href="/admin/parents" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Add New Parent</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800 mb-6">
                    <strong>Note:</strong> This creates a Parent profile. Share their email so they can Sign Up, or use an invitation system later.
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        required type="text" value={name} onChange={e => setName(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            required type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                        value={address} onChange={e => setAddress(e.target.value)}
                        className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        rows={3}
                    />
                </div>

                <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur py-4 border-t border-gray-100 -mx-4 px-4 md:mx-0 md:px-0 safe-area-pb">
                    <Link href="/admin/parents" className="px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={18} />}
                        Create Parent
                    </button>
                </div>
            </form>
        </div>
    );
}
