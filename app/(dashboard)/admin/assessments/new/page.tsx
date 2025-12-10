"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Assessment } from "@/lib/types";
import { ArrowLeft, Save, User, UserCheck, BookOpen, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';

export default function NewAssessmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

    // Form State
    const [studentName, setStudentName] = useState("");
    const [studentGrade, setStudentGrade] = useState("");

    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");
    const [parentPhone, setParentPhone] = useState("");

    const [subjects, setSubjects] = useState(""); // Comma separated for input
    const [score, setScore] = useState("");
    const [notes, setNotes] = useState("");
    const [tutorId, setTutorId] = useState("");
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        async function fetchTutors() {
            const q = query(collection(db, "users"), where("role", "==", "TUTOR"));
            const snap = await getDocs(q);
            setTutors(snap.docs.map(d => d.data() as UserProfile));
        }
        fetchTutors();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const id = uuidv4();
            const tutor = tutors.find(t => t.uid === tutorId);

            const assessment: Assessment = {
                id,
                studentName,
                studentGrade: studentGrade || undefined,

                parentName,
                parentEmail,
                parentPhone: parentPhone || undefined,

                subjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
                score: score ? parseFloat(score) : undefined,
                notes: notes || undefined,

                tutorId,
                tutorName: tutor?.name || "Unknown",

                assessmentDate: assessmentDate, // ISO check
                convertedToStudent: false,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(db, "assessments", id), assessment);

            alert("Assessment created successfully!");
            router.push("/admin/assessments");

        } catch (e) {
            console.error("Error creating assessment:", e);
            alert("Error creating assessment");
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

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Student Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                            <User size={20} /> Potential Student
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                                <input required type="text" className="w-full p-2 border rounded-lg" value={studentName} onChange={e => setStudentName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                                <input type="text" className="w-full p-2 border rounded-lg" value={studentGrade} onChange={e => setStudentGrade(e.target.value)} placeholder="e.g. 5th Grade" />
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
                                <input required type="text" className="w-full p-2 border rounded-lg" value={parentName} onChange={e => setParentName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input required type="email" className="w-full p-2 border rounded-lg" value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="tel" className="w-full p-2 border rounded-lg" value={parentPhone} onChange={e => setParentPhone(e.target.value)} />
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input required type="date" className="w-full p-2 border rounded-lg" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tutor *</label>
                                <select required className="w-full p-2 border rounded-lg" value={tutorId} onChange={e => setTutorId(e.target.value)}>
                                    <option value="">-- Select Tutor --</option>
                                    {tutors.map(t => (
                                        <option key={t.uid} value={t.uid}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subjects (comma separated)</label>
                                <input type="text" className="w-full p-2 border rounded-lg" value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Math, English, Science" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Score / Level</label>
                                <input type="number" step="any" className="w-full p-2 border rounded-lg" value={score} onChange={e => setScore(e.target.value)} placeholder="Optional numeric score" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Observations</label>
                                <textarea className="w-full p-2 border rounded-lg h-32" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detailed feedback..." />
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
