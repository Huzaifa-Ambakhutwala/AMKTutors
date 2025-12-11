"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminTutorsPage() {
    const [tutors, setTutors] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTutors = async () => {
        try {
            const usersSnap = await getDocs(collection(db, "users"));
            const tutorList = usersSnap.docs
                .map(d => d.data() as UserProfile)
                .filter(u => u.role === 'TUTOR' && !u.isShadow);
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
            setTutors(tutors.map(t => t.uid === uid ? { ...t, isActive: !currentStatus } : t));
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
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Manage Tutors</h1>
                    <a href="/admin/tutors/new" className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        + Add Tutor
                    </a>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                                {tutors.map((tutor) => (
                                    <tr key={tutor.uid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{tutor.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{tutor.email}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1 flex-wrap">
                                                {tutor.subjects?.map(s => (
                                                    <span key={s} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold">{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(tutor.uid, !!tutor.isActive)}
                                                className={`px-2 py-1 rounded-full text-xs font-bold ${tutor.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {tutor.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 flex gap-3">
                                            <Link href={`/admin/tutors/${tutor.uid}`} className="text-gray-500 hover:text-blue-600 tooltip" title="View Details">
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
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No tutors found. Use seed tool.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
