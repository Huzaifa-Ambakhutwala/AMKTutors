"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Assessment } from "@/lib/types";
import { ArrowLeft, Save, User, UserCheck, BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditAssessmentPage() {
    const router = useRouter();
    const { id } = useParams();
    const assessmentId = id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [tutors, setTutors] = useState<UserProfile[]>([]);

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
    const [assessmentDate, setAssessmentDate] = useState("");

    const [isConverted, setIsConverted] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Tutors
                const qTutors = query(collection(db, "users"), where("role", "==", "TUTOR"));
                const snapTutors = await getDocs(qTutors);
                setTutors(snapTutors.docs.map(d => d.data() as UserProfile));

                // Fetch Assessment
                const docRef = doc(db, "assessments", assessmentId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Assessment;
                    setStudentName(data.studentName);
                    setStudentGrade(data.studentGrade || "");

                    setParentName(data.parentName);
                    setParentEmail(data.parentEmail);
                    setParentPhone(data.parentPhone || "");

                    setSubjects(data.subjects.join(", "));
                    setScore(data.score ? data.score.toString() : "");
                    setNotes(data.notes || "");
                    setTutorId(data.tutorId);
                    setAssessmentDate(data.assessmentDate);

                    setIsConverted(data.convertedToStudent);
                } else {
                    alert("Assessment not found");
                    router.push("/admin/assessments");
                }
            } catch (e) {
                console.error("Error fetching data:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [assessmentId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const tutor = tutors.find(t => t.uid === tutorId);
            const docRef = doc(db, "assessments", assessmentId);

            await updateDoc(docRef, {
                studentName,
                studentGrade: studentGrade || null,

                parentName,
                parentEmail,
                parentPhone: parentPhone || null,

                subjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
                score: score ? parseFloat(score) : null,
                notes: notes || null,

                tutorId,
                tutorName: tutor?.name || "Unknown",

                assessmentDate: assessmentDate,
                updatedAt: new Date().toISOString()
            });

            alert("Assessment updated successfully!");
            router.push("/admin/assessments");

        } catch (e) {
            console.error("Error updating assessment:", e);
            alert("Error updating assessment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /> Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin/assessments" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to List
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
                        <BookOpen className="text-blue-600" /> Edit Assessment
                    </h1>
                    {isConverted && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">Converted to Student</span>}
                </div>

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
                            disabled={submitting}
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            {submitting ? <Loader2 className="animate-spin" /> : <Save />}
                            Update Assessment
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
