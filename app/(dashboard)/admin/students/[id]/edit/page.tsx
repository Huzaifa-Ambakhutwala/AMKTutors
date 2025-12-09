"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { UserProfile, Student } from "@/lib/types";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditStudentPage() {
    const router = useRouter();
    const { id } = useParams();
    const studentId = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");
    const [school, setSchool] = useState("");
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

    const [selectedParents, setSelectedParents] = useState<string[]>([]);
    const [selectedTutors, setSelectedTutors] = useState<string[]>([]);

    // Data Lists
    const [parents, setParents] = useState<UserProfile[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                // 1. Fetch Student Data
                const studentDoc = await getDoc(doc(db, "students", studentId));
                if (!studentDoc.exists()) {
                    alert("Student not found");
                    router.push("/admin/students");
                    return;
                }
                const data = studentDoc.data() as Student;
                setName(data.name);
                setGrade(data.grade);
                setSchool(data.school || "");
                setStatus(data.status);
                setSelectedParents(data.parentIds || []);
                setSelectedTutors(data.tutorIds || []);

                // 2. Fetch Users to populate selection lists
                const snap = await getDocs(collection(db, "users"));
                const users = snap.docs.map(d => d.data() as UserProfile);
                setParents(users.filter(u => u.role === 'PARENT'));
                setTutors(users.filter(u => u.role === 'TUTOR'));

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [studentId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateDoc(doc(db, "students", studentId), {
                name,
                grade,
                school,
                parentIds: selectedParents,
                tutorIds: selectedTutors,
                status
            });
            router.push("/admin/students");
        } catch (e) {
            alert("Error updating student");
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSelection = (id: string, currentList: string[], setter: (val: string[]) => void) => {
        if (currentList.includes(id)) {
            setter(currentList.filter(x => x !== id));
        } else {
            setter([...currentList, id]);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-3xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/students" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Edit Student</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold border-b pb-2">Student Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    required type="text" value={name} onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                                <input
                                    required type="text" value={grade} onChange={e => setGrade(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                                <input
                                    required type="text" value={school} onChange={e => setSchool(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Relationships */}
                    <div className="space-y-4 pt-4">
                        <h2 className="text-lg font-semibold border-b pb-2">Assign Relationships</h2>

                        {/* Parents */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Parents</label>
                            <div className="flex flex-wrap gap-2">
                                {parents.map(p => (
                                    <button
                                        key={p.uid}
                                        type="button"
                                        onClick={() => toggleSelection(p.uid, selectedParents, setSelectedParents)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedParents.includes(p.uid)
                                                ? 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tutors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Tutors</label>
                            <div className="flex flex-wrap gap-2">
                                {tutors.map(t => (
                                    <button
                                        key={t.uid}
                                        type="button"
                                        onClick={() => toggleSelection(t.uid, selectedTutors, setSelectedTutors)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${selectedTutors.includes(t.uid)
                                                ? 'bg-purple-100 text-purple-700 border-purple-200 ring-2 ring-purple-500/20'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                                            }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <Link href="/admin/students" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
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
        </RoleGuard>
    );
}
