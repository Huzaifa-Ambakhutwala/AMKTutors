"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Assessment } from "@/lib/types";
import { ArrowLeft, Save, User, UserCheck, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';
import { normalizeOptionalString } from "@/lib/utils";
import { FormFeedback, InlineError } from "@/components/FormFeedback";

export default function NewAssessmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    // Form Feedback
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form State
    const [studentName, setStudentName] = useState("");
    const [studentGrade, setStudentGrade] = useState("");

    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [parentPhone, setParentPhone] = useState("");

    const [subjects, setSubjects] = useState("");
    const [score, setScore] = useState("");
    const [notes, setNotes] = useState("");
    const [tutorId, setTutorId] = useState("");
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        async function fetchTutors() {
            try {
                const q = query(collection(db, "users"), where("role", "==", "TUTOR"));
                const snap = await getDocs(q);
                setTutors(snap.docs.map(d => d.data() as UserProfile));
            } catch (e) {
                console.error("Error fetching tutors:", e);
                setGlobalError("Failed to load tutors list.");
            }
        }
        fetchTutors();
    }, []);

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
        if (!assessmentDate) newErrors.assessmentDate = "Date is required";

        // Optional logic: Require notes for assessments?
        if (!notes.trim()) newErrors.notes = "Please add some assessment notes/observations";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalError(null);

        if (!validate()) return;

        setLoading(true);

        try {
            const id = uuidv4();
            const tutor = tutors.find(t => t.uid === tutorId);

            const assessment: Assessment = {
                id,
                studentName: studentName.trim(),
                studentGrade: normalizeOptionalString(studentGrade),

                parentName: parentName.trim(),
                parentEmail: parentEmail.trim(),
                parentPhone: normalizeOptionalString(parentPhone),

                subjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
                score: score ? parseFloat(score) : undefined,

                notes: normalizeOptionalString(notes),

                tutorId,
                tutorName: tutor?.name || "Unknown",

                assessmentDate: assessmentDate,
                convertedToStudent: false,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Sanitize undefined values just in case
            // A helper strictly for this:
            const payload = JSON.parse(JSON.stringify(assessment));
            // JSON.stringify removes undefined keys automatically! This is a cheap way to ensure "Omit entirely".
            // But it converts Dates to strings (which they already are here).

            await setDoc(doc(db, "assessments", id), payload);

            // alert("Assessment created successfully!"); 
            // Use Toast/Banner instead? We'll redirect with parameter or just redirect.
            router.push("/admin/assessments");

        } catch (e: any) {
            console.error("Error creating assessment:", e);
            setGlobalError(e.message || "Could not save assessment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/assessments" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to List
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h1 className="text-2xl font-bold font-heading mb-6 flex items-center gap-2">
                    <BookOpen className="text-blue-600" /> New Assessment
                </h1>

                <FormFeedback message={globalError} type="error" />

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

                    {/* Assessment Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                            <BookOpen size={20} /> Assessment Details
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    className={`w-full p-2 border rounded-lg ${errors.assessmentDate ? 'border-red-500' : 'border-gray-300'}`}
                                    value={assessmentDate}
                                    onChange={e => setAssessmentDate(e.target.value)}
                                />
                                <InlineError message={errors.assessmentDate} />
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Score / Level</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full p-2 border rounded-lg border-gray-300"
                                    value={score}
                                    onChange={e => setScore(e.target.value)}
                                    placeholder="Optional numeric score"
                                />
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
                            disabled={loading}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save />}
                            Create Assessment
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
