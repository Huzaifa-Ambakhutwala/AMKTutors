"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import FloatingActionButton from "@/components/FloatingActionButton";

export default function AdminTutorsPage() {
    const [tutors, setTutors] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const isMobile = useIsMobile();

    const fetchTutors = async () => {
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            const tutorList = usersSnap.docs
                .map(d => d.data() as UserProfile)
                .filter(u => u.role === "TUTOR" && !(u as { isShadow?: boolean }).isShadow);
            setTutors(tutorList);
        } catch (e) {
            console.error("Error fetching tutors:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTutors();
    }, []);

    const toggleStatus = async (uid: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "users", uid), { isActive: !currentStatus });
            setTutors(tutors.map(t => (t.uid === uid ? { ...t, isActive: !currentStatus } : t)));
        } catch (e) {
            console.error("Error updating status:", e);
        }
    };

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this tutor?")) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            setTutors(tutors.filter(t => t.uid !== uid));
        } catch (e) {
            alert("Error deleting tutor");
            console.error(e);
        }
    };

    return (
        <RoleGuard allowedRoles={["ADMIN"]}>
            <div className="w-full max-w-full overflow-x-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Manage Tutors</h1>
                    <Link
                        href="/admin/tutors/new"
                        className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
                    >
                        <Plus size={20} /> Add Tutor
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : isMobile ? (
                    <div className="space-y-4 pb-24">
                        {tutors.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                <p className="text-gray-500">No tutors found.</p>
                            </div>
                        ) : (
                            tutors.map(tutor => (
                                <div
                                    key={tutor.uid}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{tutor.name}</h3>
                                            <p className="text-sm text-gray-600">{tutor.email}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(tutor.uid, !!tutor.isActive)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold min-h-[36px] ${tutor.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                        >
                                            {tutor.isActive ? "Active" : "Inactive"}
                                        </button>
                                    </div>
                                    {tutor.subjects && tutor.subjects.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {tutor.subjects.map(s => (
                                                <span
                                                    key={s}
                                                    className="bg-[#1A2742]/10 text-primary px-3 py-1 rounded-full text-xs font-semibold"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                                        <Link
                                            href={`/admin/tutors/${tutor.uid}`}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center gap-2"
                                        >
                                            <Eye size={18} /> View
                                        </Link>
                                        <Link
                                            href={`/admin/tutors/${tutor.uid}/edit`}
                                            className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center gap-2"
                                        >
                                            <Edit size={18} /> Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(tutor.uid)}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium min-h-[48px] min-w-[48px] flex items-center justify-center"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Subjects</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {tutors.map(tutor => (
                                        <tr key={tutor.uid} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{tutor.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{tutor.email}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-1 flex-wrap">
                                                    {tutor.subjects?.map(s => (
                                                        <span
                                                            key={s}
                                                            className="bg-[#1A2742]/10 text-primary px-2 py-1 rounded text-xs font-semibold"
                                                        >
                                                            {s}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleStatus(tutor.uid, !!tutor.isActive)}
                                                    className={`px-2 py-1 rounded-full text-xs font-bold ${tutor.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                                >
                                                    {tutor.isActive ? "Active" : "Inactive"}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 flex gap-3">
                                                <Link href={`/admin/tutors/${tutor.uid}`} className="text-gray-500 hover:text-primary" title="View">
                                                    <Eye size={18} />
                                                </Link>
                                                <Link href={`/admin/tutors/${tutor.uid}/edit`} className="text-gray-500 hover:text-orange-500" title="Edit">
                                                    <Edit size={18} />
                                                </Link>
                                                <button onClick={() => handleDelete(tutor.uid)} className="text-gray-500 hover:text-red-500" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tutors.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                No tutors found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <FloatingActionButton href="/admin/tutors/new" label="Add Tutor" />
            </div>
        </RoleGuard>
    );
}
