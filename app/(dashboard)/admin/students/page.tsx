"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Student } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        try {
            const snap = await getDocs(collection(db, "students"));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
            setStudents(list);
        } catch (e) {
            console.error("Error fetching students:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "students", id));
            setStudents(students.filter(s => s.id !== id));
        } catch (e) {
            alert("Error deleting student");
            console.error(e);
        }
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-heading">Manage Students</h1>
                    <a href="/admin/students/new" className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        + Add Student
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
                                    <th className="px-6 py-4 font-semibold text-gray-700">Grade</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">School</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{s.name}</td>
                                        <td className="px-6 py-4">{s.grade}</td>
                                        <td className="px-6 py-4 text-gray-500">{s.school}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex gap-3">
                                            <Link href={`/admin/students/${s.id}`} className="text-gray-500 hover:text-blue-600 tooltip" title="View Details">
                                                <Eye size={18} />
                                            </Link>
                                            <Link href={`/admin/students/${s.id}/edit`} className="text-gray-500 hover:text-orange-500" title="Edit">
                                                <Edit size={18} />
                                            </Link>
                                            <button onClick={() => handleDelete(s.id)} className="text-gray-500 hover:text-red-500" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
