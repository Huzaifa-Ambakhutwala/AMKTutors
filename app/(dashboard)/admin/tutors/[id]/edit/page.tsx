"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Lock, Phone, DollarSign } from "lucide-react";
import Link from "next/link";
import { UserProfile } from "@/lib/types";

export default function EditTutorPage() {
    const router = useRouter();
    const { id } = useParams();
    const uid = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subjects, setSubjects] = useState("");
    const [phone, setPhone] = useState("");
    const [adminNotes, setAdminNotes] = useState("");
    const [hourlyPayRate, setHourlyPayRate] = useState("");
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        async function fetchTutor() {
            try {
                const docSnap = await getDoc(doc(db, "users", uid));
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setName(data.name || "");
                    setEmail(data.email || "");
                    setSubjects(data.subjects?.join(', ') || "");
                    setPhone(data.phone || "");
                    setAdminNotes(data.adminNotes || "");
                    setHourlyPayRate(data.hourlyPayRate ? data.hourlyPayRate.toString() : "");
                    setIsActive(data.isActive ?? true);
                } else {
                    alert("Tutor not found");
                    router.push("/admin/tutors");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchTutor();
    }, [uid, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateDoc(doc(db, "users", uid), {
                name,
                email,
                subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
                phone,
                adminNotes,
                hourlyPayRate: hourlyPayRate ? parseFloat(hourlyPayRate) : null,
                isActive,
            });

            router.push("/admin/tutors");
        } catch (e) {
            alert("Error updating tutor");
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
                <Link href="/admin/tutors" className="p-2.5 hover:bg-gray-100 rounded-full transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Edit Tutor</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        required type="text" value={name} onChange={e => setName(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        required type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
                    <input
                        type="text" value={subjects} onChange={e => setSubjects(e.target.value)}
                        className={inputClass}
                        placeholder="Math, Science, etc."
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
                                className={inputClass}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <DollarSign size={14} className="text-gray-400" /> Hourly Pay Rate ($)
                            </label>
                            <input
                                type="number" step="0.01" min="0" inputMode="decimal"
                                value={hourlyPayRate} onChange={e => setHourlyPayRate(e.target.value)}
                                className={inputClass}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (Private)</label>
                            <textarea
                                value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                                className="w-full px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                                placeholder="Internal notes about this tutor..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 min-h-[48px]">
                    <input
                        type="checkbox" id="active"
                        checked={isActive} onChange={e => setIsActive(e.target.checked)}
                        className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="text-sm text-gray-700">Active Status</label>
                </div>

                <div className="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur py-4 border-t border-gray-100 -mx-4 px-4 md:mx-0 md:px-0 safe-area-pb">
                    <Link href="/admin/tutors" className="px-4 py-3 min-h-[48px] border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center">
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
