"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, query, setDoc, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Evaluation } from "@/lib/types";
import { ArrowLeft, Save, User, UserCheck, BookOpen, Loader2, DollarSign } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';
import { normalizeOptionalString } from "@/lib/utils";
import { FormFeedback, InlineError } from "@/components/FormFeedback";

export default function NewEvaluationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [tutors, setTutors] = useState<UserProfile[]>([]);
    const [existingParents, setExistingParents] = useState<UserProfile[]>([]);
    const [parentMode, setParentMode] = useState<'new' | 'existing'>('new');
    const [selectedParentId, setSelectedParentId] = useState("");

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
    const [notes, setNotes] = useState("");
    const [tutorId, setTutorId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [charge, setCharge] = useState("");

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Tutors and Admins
                const tutorsQ = query(collection(db, "users"), where("role", "in", ["TUTOR", "ADMIN"]));
                const tutorsSnap = await getDocs(tutorsQ);
                setTutors(tutorsSnap.docs.map(d => d.data() as UserProfile).filter(u => !u.isShadow));

                // Fetch Parents
                const parentsQ = query(collection(db, "users"), where("role", "==", "PARENT"));
                const parentsSnap = await getDocs(parentsQ);
                setExistingParents(parentsSnap.docs.map(d => d.data() as UserProfile).filter(u => !u.isShadow));
            } catch (e) {
                console.error("Error fetching data:", e);
                setGlobalError("Failed to load form data.");
            }
        }
        fetchData();
    }, []);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!studentName.trim()) newErrors.studentName = "Student Name is required";
        if (parentMode === 'existing') {
            if (!selectedParentId) newErrors.selectedParentId = "Please select a parent";
        } else {
            if (!parentName.trim()) newErrors.parentName = "Parent Name is required";
            if (!parentEmail.trim()) {
                newErrors.parentEmail = "Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
                newErrors.parentEmail = "Invalid email format";
            }
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

        if (!validate()) return;

        setLoading(true);

        try {
            const id = uuidv4();
            const tutor = tutors.find(t => t.uid === tutorId);

            let finalParentId = selectedParentId;

            // If New Parent, create Shadow User
            if (parentMode === 'new') {
                finalParentId = uuidv4();
                const shadowParent: UserProfile = {
                    uid: finalParentId,
                    name: parentName.trim(),
                    email: parentEmail.trim(),
                    phone: normalizeOptionalString(parentPhone),
                    role: 'PARENT',
                    isShadow: true, // Mark as shadow/lead
                    status: 'invited', // or just 'registered' to default? 'invited' implies we sent an invite. Let's say 'invited' but with no auth yet.
                    createdAt: new Date().toISOString()
                };
                await setDoc(doc(db, "users", finalParentId), shadowParent);
            }

            const evaluation: Evaluation = {
                id,
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
                convertedToStudent: false,
                convertedParentId: finalParentId, // Link early if possible

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const payload = JSON.parse(JSON.stringify(evaluation));
            await setDoc(doc(db, "evaluations", id), payload);

            // Create Evaluation Session for Calendar & Billing
            // Defaulting to 1 hour duration.
            const sessionStart = new Date(`${date}T12:00:00`);
            const sessionEnd = new Date(sessionStart.getTime() + 60 * 60000);

            await addDoc(collection(db, "sessions"), {
                studentId: parentMode === 'existing' ? "EVALUATION-PLACEHOLDER" : "NEW-EVALUATION",
                studentName: studentName.trim(),
                tutorId: tutor?.uid || "",
                tutorName: tutor?.name || "Unknown",
                subject: "Evaluation",
                startTime: sessionStart.toISOString(),
                endTime: sessionEnd.toISOString(),
                durationMinutes: 60,
                status: 'Completed', // Default to Completed so it's billable
                location: "Online",
                attendance: 'Present',
                createdAt: new Date().toISOString(),

                // Fields for Billing linking
                parentId: finalParentId,
                evaluationId: id,
                // We use 'cost' to override the calculated rate in billing
                cost: charge ? parseFloat(charge) : 0
            });

            router.push("/admin/evaluations");

        } catch (e: any) {
            console.error("Error creating evaluation:", e);
            setGlobalError(e.message || "Could not save evaluation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/evaluations" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to List
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <h1 className="text-2xl font-bold font-heading mb-6 flex items-center gap-2">
                    <BookOpen className="text-blue-600" /> New Evaluation
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
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                                <UserCheck size={20} /> Parent / Guardian
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParentMode('existing');
                                        setParentName("");
                                        setParentEmail("");
                                        setParentPhone("");
                                    }}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${parentMode === 'existing' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Existing Parent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setParentMode('new');
                                        setSelectedParentId("");
                                        setParentName("");
                                        setParentEmail("");
                                        setParentPhone("");
                                    }}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${parentMode === 'new' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    New Parent
                                </button>
                            </div>
                        </div>

                        {parentMode === 'existing' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Parent *</label>
                                <select
                                    className={`w-full p-2 border rounded-lg ${errors.selectedParentId ? 'border-red-500' : 'border-gray-300'}`}
                                    value={selectedParentId}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setSelectedParentId(pid);
                                        const p = existingParents.find(x => x.uid === pid);
                                        if (p) {
                                            setParentName(p.name);
                                            setParentEmail(p.email);
                                            setParentPhone(p.phone || "");
                                        } else {
                                            setParentName("");
                                            setParentEmail("");
                                            setParentPhone("");
                                        }
                                    }}
                                >
                                    <option value="">-- Choose Existing Parent --</option>
                                    {existingParents.map(p => (
                                        <option key={p.uid} value={p.uid}>
                                            {p.name} ({p.email})
                                        </option>
                                    ))}
                                </select>
                                <InlineError message={errors.selectedParentId} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
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
                        )}
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
                            disabled={loading}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save />}
                            Create Evaluation
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
