"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "@/lib/types";

export default function EditParentPage() {
    const router = useRouter();
    const { id } = useParams();
    const uid = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");

    useEffect(() => {
        async function fetchParent() {
            try {
                const docSnap = await getDoc(doc(db, "users", uid));
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setName(data.name || "");
                    setEmail(data.email || "");
                    setPhone(data.phone || "");
                    setAddress(data.address || "");
                } else {
                    alert("Parent not found");
                    router.push("/admin/parents");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchParent();
    }, [uid, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateDoc(doc(db, "users", uid), {
                name,
                email,
                phone,
                address,
                // role is assumed to persist
            });

            router.push("/admin/parents");
        } catch (e) {
            alert("Error updating parent");
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const inputClass = "w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none";
    return (
        <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="mb-6 md:mb-8 flex items-center gap-4">
                <Link href="/admin/parents" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Edit Parent</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

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
                        disabled={submitting}
                        className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-primary text-white rounded-xl font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                    >
                        {submitting && <Loader2 className="animate-spin" size={18} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
