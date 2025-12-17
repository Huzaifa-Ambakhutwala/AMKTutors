"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ContactForm() {
    const [formData, setFormData] = useState({
        studentName: "",
        parentName: "", // Optional ref, but user asked for Student Name specifically. Keeping parentName as per old form is good too, but prompt asked specifically for Student Name. I'll keep both if reasonable, or just follow prompt strictly. Prompt says "Student Name (required)". Old form had Parent Name. I'll keep Parent Name as it's useful.
        email: "",
        phone: "",
        grade: "8",
        message: "",
        otherSubject: "",
    });

    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

    // Status
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Validation Errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const SUBJECT_OPTIONS = [
        "Math", "English", "Science", "Social Studies", "SAT/ACT Prep", "Elementary", "Other"
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        // Clear specific error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const toggleSubject = (subject: string) => {
        setSelectedSubjects(prev => {
            if (prev.includes(subject)) {
                return prev.filter(s => s !== subject);
            } else {
                return [...prev, subject];
            }
        });
        if (errors.subjects) setErrors(prev => ({ ...prev, subjects: "" }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.studentName.trim()) newErrors.studentName = "Student name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email address";
        }

        if (!formData.phone.trim()) newErrors.phone = "Phone number is required";

        if (selectedSubjects.length === 0) newErrors.subjects = "Please select at least one subject";

        if (selectedSubjects.includes("Other") && !formData.otherSubject.trim()) {
            newErrors.otherSubject = "Please specify the other subject";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!validate()) return;

        setStatus("loading");

        try {
            // 1. Prepare Data
            const finalSubjects = selectedSubjects.map(s => s === "Other" ? `Other: ${formData.otherSubject}` : s);

            const inquiryData = {
                studentName: formData.studentName,
                parentName: formData.parentName, // Keeping it as extra info
                email: formData.email,
                phone: formData.phone,
                grade: formData.grade,
                subjects: finalSubjects,
                otherSubject: selectedSubjects.includes("Other") ? formData.otherSubject : null,
                message: formData.message || null,
                source: "website",
                status: "new",
                createdAt: serverTimestamp()
            };

            // 2. Save to Firestore
            await addDoc(collection(db, "inquiries"), inquiryData);

            // 3. Send Confirmation Email (Async)
            // We don't await this strictly to block success UI, but good to ensure it fires. 
            // Actually, waiting for it confirms to user that everything worked.
            await fetch("/api/send-inquiry-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    studentName: formData.studentName,
                    parentName: formData.parentName,
                    phone: formData.phone,
                    grade: formData.grade,
                    subjects: finalSubjects,
                    message: formData.message
                }),
            });

            setStatus("success");

            // Reset Form (optional, or leave as success state)
            setFormData({
                studentName: "",
                parentName: "",
                email: "",
                phone: "",
                grade: "8",
                message: "",
                otherSubject: ""
            });
            setSelectedSubjects([]);

        } catch (error: any) {
            console.error("Inquiry Error:", error);
            setStatus("error");
            setErrorMessage("Something went wrong. Please try again or email us directly at tutoring.amk@gmail.com");
        }
    };

    return (
        <section id="contact" className="py-20 bg-primary text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Get Started Today</h2>
                    <p className="text-lg text-gray-100">
                        Ready to see the difference personalized tutoring can make? Fill out the form to schedule your free consultation.
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl text-gray-900 transition-all">
                    {status === "success" ? (
                        <div className="text-center py-12 animate-in fade-in zoom-in">
                            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Inquiry Received!</h3>
                            <p className="text-gray-600 mb-6">
                                Thank you for contacting AMK Tutors. We have sent a confirmation email to <strong>{formData.email}</strong> and will be in touch shortly.
                            </p>
                            <button
                                onClick={() => setStatus("idle")}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-accent"
                            >
                                Send Another Inquiry
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Student & Parent Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name *</label>
                                    <input
                                        type="text"
                                        name="studentName"
                                        value={formData.studentName}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.studentName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none`}
                                        placeholder="Student's Full Name"
                                    />
                                    {errors.studentName && <p className="text-red-500 text-xs mt-1">{errors.studentName}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Name</label>
                                    <input
                                        type="text"
                                        name="parentName"
                                        value={formData.parentName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Parent's Name (Optional)"
                                    />
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none`}
                                        placeholder="you@example.com"
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none`}
                                        placeholder="(555) 123-4567"
                                    />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Grade & Subjects */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Student Grade</label>
                                <select
                                    name="grade"
                                    value={formData.grade}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none bg-white"
                                >
                                    <option value="K-5">K-5 Elementary</option>
                                    <option value="6">6th Grade</option>
                                    <option value="7">7th Grade</option>
                                    <option value="8">8th Grade</option>
                                    <option value="9">9th Grade</option>
                                    <option value="10">10th Grade</option>
                                    <option value="11">11th Grade</option>
                                    <option value="12">12th Grade</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Subjects of Interest *</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {SUBJECT_OPTIONS.map(subj => (
                                        <button
                                            key={subj}
                                            type="button"
                                            onClick={() => toggleSubject(subj)}
                                            className={`px-3 py-2 text-sm rounded-lg border transition-all ${selectedSubjects.includes(subj)
                                                ? 'bg-primary text-white border-primary shadow-md'
                                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            {subj}
                                        </button>
                                    ))}
                                </div>
                                {errors.subjects && <p className="text-red-500 text-xs mt-1">{errors.subjects}</p>}

                                {/* Other Input */}
                                {selectedSubjects.includes("Other") && (
                                    <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            name="otherSubject"
                                            value={formData.otherSubject}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-2 rounded-lg border ${errors.otherSubject ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none text-sm`}
                                            placeholder="Please specify subject..."
                                        />
                                        {errors.otherSubject && <p className="text-red-500 text-xs mt-1">{errors.otherSubject}</p>}
                                    </div>
                                )}
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Message (Optional)</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none h-24"
                                    placeholder="Tell us about the student's goals or specific needs..."
                                />
                            </div>

                            {/* Global Error */}
                            {status === "error" && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
                                    <AlertCircle size={16} />
                                    {errorMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-accent transition-colors shadow-lg text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === "loading" && <Loader2 className="animate-spin" />}
                                {status === "loading" ? "Sending Inquiry..." : "Submit Inquiry"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
