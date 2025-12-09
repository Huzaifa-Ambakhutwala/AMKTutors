"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
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

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/admin/tutors" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-3xl font-bold font-heading">Edit Tutor</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

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
                        placeholder="Math, Science, etc."
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox" id="active"
                        checked={isActive} onChange={e => setIsActive(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="text-sm text-gray-700">Active Status</label>
                </div>

                <div className="pt-6 flex justify-end gap-3">
                    <Link href="/admin/tutors" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="animate-spin" size={18} />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
