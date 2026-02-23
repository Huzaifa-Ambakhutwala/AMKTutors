"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Student } from "@/lib/types";
import { Loader2, Eye, Edit, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";
import SearchFilterBar from "@/components/SearchFilterBar";

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | "Active" | "Inactive">("");
    const isMobile = useIsMobile();

    const filteredStudents = students.filter(s => {
        const matchesSearch =
            !searchTerm.trim() ||
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.subjects?.some(subj => subj.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = !statusFilter || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
            toast.error("Error deleting student");
            console.error(e);
        }
    };

    const renderMobileCard = (s: Student) => {
        const preferredTime = s.plannedSessions?.preferredTime;
        let timeDisplay = null;
        
        if (preferredTime && typeof preferredTime === 'string') {
            timeDisplay = (
                <div className="flex flex-col gap-0.5">
                    <span className="text-sm">@ {preferredTime || "TBD"}</span>
                    <span className="text-xs text-gray-400">{s.plannedSessions?.daysOfWeek?.join(", ")}</span>
                </div>
            );
        } else if (preferredTime && typeof preferredTime === 'object') {
            const times = preferredTime as Record<string, string>;
            const timeEntries = Object.entries(times).filter(([_, time]) => time);
            if (timeEntries.length > 0) {
                timeDisplay = (
                    <div className="flex flex-col gap-1 text-xs">
                        {timeEntries.map(([day, time]) => (
                            <span key={day} className="text-gray-600">
                                {day}: {time}
                            </span>
                        ))}
                    </div>
                );
            }
        }

        return (
            <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{s.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">Grade: {s.grade}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {s.status}
                    </span>
                </div>
                
                {s.subjects && s.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {s.subjects.map(subj => (
                            <span key={subj} className="text-xs bg-[#1A2742]/10 text-primary px-3 py-1 rounded-full border border-[#1A2742]/20">
                                {subj}
                            </span>
                        ))}
                    </div>
                )}
                
                {s.plannedSessions && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                            {s.plannedSessions.sessionsPerWeek}/wk
                        </div>
                        {timeDisplay}
                    </div>
                )}
                
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Link 
                        href={`/admin/students/${s.id}`}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center"
                    >
                        <Eye size={18} className="mr-2" />
                        View
                    </Link>
                    <Link 
                        href={`/admin/students/${s.id}/edit`}
                        className="flex-1 bg-primary hover:bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center"
                    >
                        <Edit size={18} className="mr-2" />
                        Edit
                    </Link>
                    <button 
                        onClick={() => handleDelete(s.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="w-full max-w-full overflow-x-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold font-heading">Manage Students</h1>
                    <Link 
                        href="/admin/students/new"
                        className="bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
                    >
                        <Plus size={20} />
                        Add Student
                    </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="flex-1 min-w-0">
                        <SearchFilterBar
                            placeholder="Search by name, grade, or subject..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "" | "Active" | "Inactive")}
                        className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white min-h-[44px] sm:w-40"
                    >
                        <option value="">All statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                ) : isMobile ? (
                    <div className="space-y-4">
                        {filteredStudents.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                <p className="text-gray-500">No students found</p>
                            </div>
                        ) : (
                            filteredStudents.map(renderMobileCard)
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Name</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Grade</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Subjects</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Planned Sessions</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{s.name}</td>
                                            <td className="px-6 py-4">{s.grade}</td>
                                            <td className="px-6 py-4">
                                                {s.subjects && s.subjects.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {s.subjects.map(subj => (
                                                            <span key={subj} className="text-xs bg-[#1A2742]/10 text-primary px-2 py-0.5 rounded-full border border-[#1A2742]/20">
                                                                {subj}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {s.plannedSessions ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span><strong>{s.plannedSessions.sessionsPerWeek}</strong>/wk</span>
                                                        {(() => {
                                                            const preferredTime = s.plannedSessions.preferredTime;
                                                            if (typeof preferredTime === 'string') {
                                                                return (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span>@ {preferredTime || "TBD"}</span>
                                                                        <span className="text-xs text-gray-400">{s.plannedSessions.daysOfWeek.join(", ")}</span>
                                                                    </div>
                                                                );
                                                            } else if (preferredTime && typeof preferredTime === 'object') {
                                                                const times = preferredTime as Record<string, string>;
                                                                const timeEntries = Object.entries(times).filter(([_, time]) => time);
                                                                if (timeEntries.length > 0) {
                                                                    return (
                                                                        <div className="flex flex-col gap-0.5 text-xs">
                                                                            {timeEntries.map(([day, time]) => (
                                                                                <span key={day} className="text-gray-500">
                                                                                    {day}: {time}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return <span className="text-gray-400">Times TBD</span>;
                                                                }
                                                            } else {
                                                                return <span className="text-gray-400">Times TBD</span>;
                                                            }
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">No schedule</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex gap-3">
                                                <Link href={`/admin/students/${s.id}`} className="text-gray-500 hover:text-primary tooltip" title="View Details">
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
                    </div>
                )}
            </div>
        </RoleGuard>
    );
}
