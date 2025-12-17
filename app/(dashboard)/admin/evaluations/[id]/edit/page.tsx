"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Evaluation } from "@/lib/types";
import { ArrowLeft, Save, User, UserCheck, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { normalizeOptionalString } from "@/lib/utils";
import { FormFeedback, InlineError } from "@/components/FormFeedback";

export default function EditEvaluationPage() {
    const router = useRouter();
    const { id } = useParams();
    const evaluationId = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    // Form Feedback
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form State
    const [studentName, setStudentName] = useState("");
    const [studentGrade, setStudentGrade] = useState("");

    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [parentPhone, setParentPhone] = useState("");

    const [subjects, setSubjects] = useState("");
    const [notes, setNotes] = useState("");
    const [tutorId, setTutorId] = useState("");
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("Scheduled");
    const [charge, setCharge] = useState("");

    const [isConverted, setIsConverted] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Tutors and Admins
                const qTutors = query(collection(db, "users"), where("role", "in", ["TUTOR", "ADMIN"]));
                const snapTutors = await getDocs(qTutors);
                setTutors(snapTutors.docs.map(d => d.data() as UserProfile).filter(u => !u.isShadow));

                // Fetch Evaluation
                const docRef = doc(db, "evaluations", evaluationId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Evaluation;
                    // ... set fields ...
                    setStudentName(data.studentName);
                    setStudentGrade(data.studentGrade || "");

                    setParentName(data.parentName);
                    setParentEmail(data.parentEmail);
                    setParentPhone(data.parentPhone || "");

                    setSubjects(data.subjects.join(", "));
                    setNotes(data.notes || "");
                    setTutorId(data.tutorId);
                    setDate(data.date);

                    setIsConverted(data.convertedToStudent);

                    // Fetch Linked Session Status & Cost
                    const sessionsQ = query(collection(db, "sessions"), where("evaluationId", "==", evaluationId));
                    const sessionsSnap = await getDocs(sessionsQ);
                    if (!sessionsSnap.empty) {
                        const sData = sessionsSnap.docs[0].data();
                        setStatus(sData.status || "Scheduled");
                        // Load cost if it exists
                        if (sData.cost !== undefined && sData.cost !== null) {
                            setCharge(sData.cost.toString());
                        }
                    }
                } else {
                    setGlobalError("Evaluation not found");
                }
            } catch (e) {
                console.error("Error fetching data:", e);
                setGlobalError("Failed to load evaluation data.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [evaluationId, router]);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!studentName.trim()) newErrors.studentName = "Student Name is required";
        if (!parentName.trim()) newErrors.parentName = "Parent Name is required";

        if (!parentEmail.trim()) {
            newErrors.parentEmail = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
            newErrors.parentEmail = "Invalid email format";
        }

        if (!tutorId) newErrors.tutorId = "Please assign a tutor";
        if (!subjects.trim()) newErrors.subjects = "At least one subject is required";
        if (!date) newErrors.date = "Date is required";

        if (!notes.trim()) newErrors.notes = "Please add some evaluation notes/observations";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalError(null);
        setSuccessMsg(null);

        if (!validate()) return;

        setSubmitting(true);

        try {
            const tutor = tutors.find(t => t.uid === tutorId);
            const docRef = doc(db, "evaluations", evaluationId);

            await updateDoc(docRef, {
                studentName: studentName.trim(),
                studentGrade: normalizeOptionalString(studentGrade),

                parentName: parentName.trim(),
                parentEmail: parentEmail.trim(),
                parentPhone: normalizeOptionalString(parentPhone),

                subjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
                notes: normalizeOptionalString(notes),

                tutorId,
                tutorName: tutor?.name || "Unknown",

                date: date,
                updatedAt: new Date().toISOString()
            });

            // Update Linked Session Status & Cost
            const sessionsQ = query(collection(db, "sessions"), where("evaluationId", "==", evaluationId));
            const sessionsSnap = await getDocs(sessionsQ);
            if (!sessionsSnap.empty) {
                const sessionDoc = sessionsSnap.docs[0];
                await updateDoc(sessionDoc.ref, {
                    status: status,
                    cost: charge ? parseFloat(charge) : 0
                });
            }

            setSuccessMsg("Evaluation updated successfully!");
            setTimeout(() => router.push("/admin/evaluations"), 1000);

        } catch (e: any) {
            console.error("Error updating evaluation:", e);
            setGlobalError(e.message || "Failed to update evaluation.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /> Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/evaluations" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to List
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <BookOpen className="text-blue-600" /> Edit Evaluation
                    </h1>
                    {isConverted && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">Converted to Student</span>}
                </div>

                <FormFeedback message={globalError} type="error" />
                <FormFeedback message={successMsg} type="success" />

                <form onSubmit={handleSubmit} className="space-y-8 mt-6">

                    {/* Student Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                            <User size={20} /> Potential Student
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded-lg ${errors.studentName ? 'border-red-500' : 'border-gray-300'}`}
                                    value={studentName}
                                    onChange={e => setStudentName(e.target.value)}
                                />
                                <InlineError message={errors.studentName} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg border-gray-300"
                                    value={studentGrade}
                                    onChange={e => setStudentGrade(e.target.value)}
                                    placeholder="e.g. 5th Grade"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Parent Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                            <UserCheck size={20} /> Parent / Guardian
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name *</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded-lg ${errors.parentName ? 'border-red-500' : 'border-gray-300'}`}
                                    value={parentName}
                                    onChange={e => setParentName(e.target.value)}
                                />
                                <InlineError message={errors.parentName} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    className={`w-full p-2 border rounded-lg ${errors.parentEmail ? 'border-red-500' : 'border-gray-300'}`}
                                    value={parentEmail}
                                    onChange={e => setParentEmail(e.target.value)}
                                />
                                <InlineError message={errors.parentEmail} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    className="w-full p-2 border rounded-lg border-gray-300"
                                    value={parentPhone}
                                    onChange={e => setParentPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Evaluation Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                            <BookOpen size={20} /> Evaluation Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded-lg ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                                <InlineError message={errors.date} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    className="w-full p-2 border rounded-lg border-gray-300"
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                >
                                    <option value="Scheduled">Scheduled</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tutor *</label>
                                <select
                                    className={`w-full p-2 border rounded-lg ${errors.tutorId ? 'border-red-500' : 'border-gray-300'}`}
                                    value={tutorId}
                                    onChange={e => setTutorId(e.target.value)}
                                >
                                    <option value="">-- Select Tutor --</option>
                                    {tutors.map(t => (
                                        <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                </select>
                                <InlineError message={errors.tutorId} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated) *</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded-lg ${errors.subjects ? 'border-red-500' : 'border-gray-300'}`}
                                    value={subjects}
                                    onChange={e => setSubjects(e.target.value)}
                                    placeholder="Math, English, Science"
                                />
                                <InlineError message={errors.subjects} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Charge ($)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-7 p-2 border rounded-lg border-gray-300"
                                        value={charge}
                                        onChange={e => setCharge(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Observations *</label>
                                <textarea
                                    className={`w-full p-2 border rounded-lg h-32 ${errors.notes ? 'border-red-500' : 'border-gray-300'}`}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Detailed feedback..."
                                />
                                <InlineError message={errors.notes} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Save />}
                            Update Evaluation
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
