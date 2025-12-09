"use client";

import RoleGuard from "@/components/RoleGuard";
import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { UserProfile } from "@/lib/types";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AddStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    // Form State
    const [name, setName] = useState("");
    const [grade, setGrade] = useState("");
    const [school, setSchool] = useState("");
    const [selectedParents, setSelectedParents] = useState<string[]>([]);
    const [selectedTutors, setSelectedTutors] = useState<string[]>([]);

    // Data Lists
    const [parents, setParents] = useState<UserProfile[]>([]);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const snap = await getDocs(collection(db, "users"));
                const users = snap.docs.map(d => d.data() as UserProfile);
                setParents(users.filter(u => u.role === 'PARENT'));
                setTutors(users.filter(u => u.role === 'TUTOR'));
            } catch (e) {
                console.error(e);
            } finally {
                setDataLoading(false);
            }
        }
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, "students"), {
                name,
                grade,
                school,
                parentIds: selectedParents,
                tutorIds: selectedTutors,
                subjects: [], // Default empty, can add later
                status: 'Active',
                createdAt: new Date().toISOString()
            });
            router.push("/admin/students");
        } catch (e) {
            alert("Error adding student");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string, currentList: string[], setter: (val: string[]) => void) => {
        if (currentList.includes(id)) {
            setter(currentList.filter(x => x !== id));
        } else {
            setter([...currentList, id]);
        }
    };

    return (
        <RoleGuard allowedRoles={['ADMIN']}>
            <div className="p-8 max-w-3xl mx-auto">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/admin/students" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold font-heading">Add New Student</h1>
                </div>

                {dataLoading ? <Loader2 className="animate-spin" /> : (
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
                                        placeholder="e.g. 10th Grade"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                                    <input
                                        required type="text" value={school} onChange={e => setSchool(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
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
                                    {parents.length === 0 && <span className="text-sm text-gray-400 italic">No parents found.</span>}
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
                                    {tutors.length === 0 && <span className="text-sm text-gray-400 italic">No tutors found.</span>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <Link href="/admin/students" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={18} />}
                                Save Student
                            </button>
                        </div>

                    </form>
                )}
            </div>
        </RoleGuard>
    );
}
