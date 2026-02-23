"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Student } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2, User, Plus } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import FloatingActionButton from "@/components/FloatingActionButton";
import { toast } from "sonner";
import SearchFilterBar from "@/components/SearchFilterBar";

export default function ParentsListPage() {
    const [parents, setParents] = useState<(UserProfile & { childCount: number })[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const isMobile = useIsMobile();

    const filteredParents = parents.filter(
        p =>
            !searchTerm.trim() ||
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.phone && p.phone.includes(searchTerm))
    );

    useEffect(() => {
        async function fetchData() {
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const parentList = usersSnap.docs
                    .map(d => d.data() as UserProfile)
                    .filter(u => u.role === "PARENT" && !(u as { isShadow?: boolean }).isShadow);

                let students: Student[] = [];
                try {
                    const studentsSnap = await getDocs(collection(db, "students"));
                    students = studentsSnap.docs.map(d => d.data() as Student);
                } catch (err) {
                    console.error("Error fetching students for count:", err);
                }

                const merged = parentList.map(p => ({
                    ...p,
                    childCount: students.filter(s => s.parentIds?.includes(p.uid)).length,
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
            toast.error("Error deleting parent");
            console.error(e);
        }
    };

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Manage Parents</h1>
                <Link
                    href="/admin/parents/new"
                    className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
                >
                    <Plus size={20} /> Add Parent
                </Link>
            </div>
            <div className="mb-6 max-w-md">
                <SearchFilterBar
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : isMobile ? (
                <div className="space-y-4 pb-24">
                    {filteredParents.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No parents found.</p>
                        </div>
                    ) : (
                        filteredParents.map(p => (
                            <div
                                key={p.uid}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                                        <p className="text-sm text-gray-600">{p.email}</p>
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {p.childCount} Students
                                    </span>
                                </div>
                                {p.phone && (
                                    <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                                        <User size={14} /> {p.phone}
                                    </p>
                                )}
                                <div className="flex gap-2 pt-3 border-t border-gray-100">
                                    <Link
                                        href={`/admin/parents/${p.uid}`}
                                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center gap-2"
                                    >
                                        <Eye size={18} /> View
                                    </Link>
                                    <Link
                                        href={`/admin/parents/${p.uid}/edit`}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center gap-2"
                                    >
                                        <Edit size={18} /> Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(p.uid)}
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
                                    <th className="px-6 py-4 font-semibold text-gray-700">Phone</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Children</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredParents.map(p => (
                                    <tr key={p.uid} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{p.name}</td>
                                        <td className="px-6 py-4 text-gray-500">{p.email}</td>
                                        <td className="px-6 py-4 text-gray-500">{p.phone || "-"}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                                                {p.childCount} Students
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex gap-3">
                                            <Link href={`/admin/parents/${p.uid}`} className="text-gray-500 hover:text-blue-600" title="View">
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
                                {filteredParents.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No parents found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <FloatingActionButton href="/admin/parents/new" label="Add Parent" />
        </div>
    );
}
