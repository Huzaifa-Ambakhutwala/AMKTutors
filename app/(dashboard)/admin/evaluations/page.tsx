"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where, doc, writeBatch, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Evaluation, UserProfile } from "@/lib/types";
import Link from "next/link";
import { Plus, Search, Edit2, UserPlus, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from 'uuid';
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";

export default function EvaluationsPage() {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [convertingId, setConvertingId] = useState<string | null>(null);
    const isMobile = useIsMobile();

    const router = useRouter();

    useEffect(() => {
        fetchEvaluations();
    }, []);

    const fetchEvaluations = async () => {
        try {
            const q = query(collection(db, "evaluations"), orderBy("date", "desc"));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => d.data() as Evaluation);
            setEvaluations(list);
        } catch (e) {
            console.error("Error fetching evaluations:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the evaluation for "${name}"? This cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "evaluations", id));
            setEvaluations(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            console.error("Error deleting evaluation:", e);
            toast.error("Failed to delete evaluation");
        }
    };

    const handleConvert = async (evaluation: Evaluation) => {
        if (!confirm(`Create Student "${evaluation.studentName}" and Parent "${evaluation.parentName}" from this evaluation?`)) return;

        setConvertingId(evaluation.id);
        try {
            const batch = writeBatch(db);

            // 1. Create Parent User Profile
            const parentQuery = query(collection(db, "users"), where("email", "==", evaluation.parentEmail));
            const parentSnap = await getDocs(parentQuery);

            let parentUid = "";
            let parentName = evaluation.parentName;

            if (!parentSnap.empty) {
                // Parent exists, link to them
                const existingParent = parentSnap.docs[0].data() as UserProfile;
                parentUid = existingParent.uid;
                parentName = existingParent.name;
            } else {
                // Create new Parent Profile
                parentUid = uuidv4();
                const parentRef = doc(db, "users", parentUid);
                const parentData: UserProfile = {
                    uid: parentUid,
                    email: evaluation.parentEmail,
                    role: 'PARENT',
                    name: evaluation.parentName,
                    phone: evaluation.parentPhone || undefined,
                    createdAt: new Date().toISOString(),
                    isActive: true,
                    students: [] // Will add student ID below
                };
                batch.set(parentRef, parentData);
            }

            // 2. Create Student
            const studentId = uuidv4();
            const studentRef = doc(db, "students", studentId);

            batch.set(studentRef, {
                id: studentId,
                name: evaluation.studentName,
                grade: evaluation.studentGrade || "",
                parentIds: [parentUid],
                tutorIds: evaluation.tutorId ? [evaluation.tutorId] : [],
                subjects: evaluation.subjects,
                status: 'Active',
                createdAt: new Date().toISOString()
            });

            // 3. Update Parent's student list
            const parentRef = doc(db, "users", parentUid);
            batch.update(parentRef, { students: arrayUnion(studentId) });

            // 4. Update Evaluation
            const evaluationRef = doc(db, "evaluations", evaluation.id);
            batch.update(evaluationRef, {
                convertedToStudent: true,
                convertedStudentId: studentId,
                convertedParentId: parentUid,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();

            toast.success(`Successfully converted! Created Student: ${evaluation.studentName}`);
            fetchEvaluations(); // Refresh

        } catch (e) {
            console.error("Error converting:", e);
            toast.error("Error converting evaluation");
        } finally {
            setConvertingId(null);
        }
    };

    const filtered = evaluations.filter(a =>
        a.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.parentName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderMobileCard = (evaluation: Evaluation) => (
        <div key={evaluation.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{evaluation.studentName}</h3>
                    <p className="text-sm text-gray-600 mb-1">Grade: {evaluation.studentGrade || "-"}</p>
                    <p className="text-xs text-gray-500">{new Date(evaluation.date + "T12:00:00").toLocaleDateString()}</p>
                </div>
                {evaluation.convertedToStudent ? (
                    <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                        <CheckCircle size={14} /> Converted
                    </span>
                ) : (
                    <span className="text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-xs">Potential</span>
                )}
            </div>
            
            <div className="mb-3">
                <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Parent:</span> {evaluation.parentName}
                </p>
                <p className="text-xs text-gray-500">{evaluation.parentEmail}</p>
            </div>
            
            {evaluation.subjects && evaluation.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {evaluation.subjects.map(s => (
                        <span key={s} className="bg-[#1A2742]/10 text-primary px-3 py-1 rounded-full text-xs">
                            {s}
                        </span>
                    ))}
                </div>
            )}
            
            {evaluation.tutorName && (
                <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Tutor:</span> {evaluation.tutorName}
                </p>
            )}
            
            {evaluation.convertedToStudent && (
                <div className="mb-3 p-2 bg-green-50 rounded-lg">
                    <div className="flex gap-2 text-xs">
                        {evaluation.convertedStudentId && (
                            <Link href={`/admin/students/${evaluation.convertedStudentId}`} className="text-primary hover:underline font-medium">
                                View Student →
                            </Link>
                        )}
                        {evaluation.convertedParentId && (
                            <Link href={`/admin/parents/${evaluation.convertedParentId}`} className="text-primary hover:underline font-medium">
                                View Parent →
                            </Link>
                        )}
                    </div>
                </div>
            )}
            
            <div className="flex gap-2 pt-3 border-t border-gray-100">
                {!evaluation.convertedToStudent && (
                    <button
                        onClick={() => handleConvert(evaluation)}
                        disabled={!!convertingId}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] flex items-center justify-center gap-2"
                    >
                        <UserPlus size={18} />
                        Convert
                    </button>
                )}
                <Link 
                    href={`/admin/evaluations/${evaluation.id}/edit`}
                    className="flex-1 bg-primary hover:bg-accent text-white px-4 py-3 rounded-lg text-sm font-medium text-center transition-colors min-h-[48px] flex items-center justify-center gap-2"
                >
                    <Edit2 size={18} />
                    Edit
                </Link>
                <button
                    onClick={() => handleDelete(evaluation.id, evaluation.studentName)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold font-heading">Evaluations</h1>
                <Link
                    href="/admin/evaluations/new"
                    className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-accent transition min-h-[48px] w-full md:w-auto"
                >
                    <Plus size={20} /> New Evaluation
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by student or parent..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
            ) : isMobile ? (
                <div className="space-y-4">
                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                            <p className="text-gray-500">No evaluations found.</p>
                        </div>
                    ) : (
                        filtered.map(renderMobileCard)
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Student</th>
                                    <th className="px-6 py-3">Grade</th>
                                    <th className="px-6 py-3">Parent</th>
                                    <th className="px-6 py-3">Subjects</th>
                                    <th className="px-6 py-3">Tutor</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-gray-500">No evaluations found.</td></tr>
                                ) : (
                                    filtered.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">{new Date(a.date + "T12:00:00").toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium">{a.studentName}</td>
                                            <td className="px-6 py-4 text-gray-500">{a.studentGrade || "-"}</td>
                                            <td className="px-6 py-4">
                                                <div>{a.parentName}</div>
                                                <div className="text-xs text-gray-400">{a.parentEmail}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {a.subjects.map(s => (
                                                        <span key={s} className="bg-[#1A2742]/10 text-primary px-2 py-0.5 rounded text-xs">{s}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{a.tutorName}</td>
                                            <td className="px-6 py-4">
                                                {a.convertedToStudent ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                                                            <CheckCircle size={12} /> Converted
                                                        </span>
                                                        <div className="flex gap-2 text-xs">
                                                            {a.convertedStudentId && <Link href={`/admin/students/${a.convertedStudentId}`} className="text-primary hover:underline">Student</Link>}
                                                            {a.convertedParentId && <Link href={`/admin/parents/${a.convertedParentId}`} className="text-primary hover:underline">Parent</Link>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs w-fit">Potential</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                {!a.convertedToStudent && (
                                                    <button
                                                        onClick={() => handleConvert(a)}
                                                        disabled={!!convertingId}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded tooltip min-h-[48px] min-w-[48px] flex items-center justify-center"
                                                        title="Convert to Student"
                                                    >
                                                        <UserPlus size={18} />
                                                    </button>
                                                )}
                                                <Link href={`/admin/evaluations/${a.id}/edit`} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded min-h-[48px] min-w-[48px] flex items-center justify-center">
                                                    <Edit2 size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(a.id, a.studentName)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded min-h-[48px] min-w-[48px] flex items-center justify-center"
                                                    title="Delete Evaluation"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
