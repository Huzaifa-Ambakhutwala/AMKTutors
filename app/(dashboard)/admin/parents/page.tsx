"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ParentsListPage() {
    const [parents, setParents] = useState<(UserProfile & { childCount: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch all parents
                const usersSnap = await getDocs(collection(db, "users"));
                const parentList = usersSnap.docs
                    .map(d => d.data() as UserProfile)
                    .filter(u => u.role === 'PARENT');

                // 2. Fetch all students to count children
                // Optimization: In a real app, store parentIds array on the Parent doc or use a count field
                const studentsSnap = await getDocs(collection(db, "students"));
                const students = studentsSnap.docs.map(d => d.data() as Student);

                // 3. Merge counts
                const merged = parentList.map(p => ({
                    ...p,
                    childCount: students.filter(s => s.parentIds && s.parentIds.includes(p.uid)).length
                }));

                setParents(merged);
            } catch (e) {
                console.error("Error fetching parents:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleDelete = async (uid: string) => {
        if (!confirm("Are you sure you want to delete this parent? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "users", uid));
            setParents(parents.filter(p => p.uid !== uid));
        } catch (e) {
            alert("Error deleting parent");
            console.error(e);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold font-heading">Manage Parents</h1>
                <Link href="/admin/parents/new" className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    + Add Parent
                </Link>
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
                                <th className="px-6 py-4 font-semibold text-gray-700">Phone</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Children</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {parents.map((p) => (
                                <tr key={p.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium">{p.name}</td>
                                    <td className="px-6 py-4 text-gray-500">{p.email}</td>
                                    <td className="px-6 py-4 text-gray-500">{p.phone || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                            {p.childCount} Students
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        {/* Detail View Link */}
                                        <Link href={`/admin/parents/${p.uid}`} className="text-gray-500 hover:text-blue-600 tooltip" title="View Details">
                                            <Eye size={18} />
                                        </Link>
                                        <Link href={`/admin/parents/${p.uid}/edit`} className="text-gray-500 hover:text-orange-500" title="Edit">
                                            <Edit size={18} />
                                        </Link>
                                        <button onClick={() => handleDelete(p.uid)} className="text-gray-500 hover:text-red-500" title="Delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {parents.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No parents found. Use seed tool or add new.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
