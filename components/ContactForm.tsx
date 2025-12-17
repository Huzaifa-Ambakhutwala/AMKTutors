"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { MotionSection, MotionDiv } from "@/lib/motion/Motion";
import { fadeUp, shake, confettiBurst, scaleIn } from "@/lib/motion/variants";

export default function ContactForm() {
    const shouldReduceMotion = useReducedMotion();
    const [formData, setFormData] = useState({
        studentName: "",
        parentName: "",
        email: "",
        phone: "",
        grade: "8",
        message: "",
        otherSubject: "",
    });

    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [shakeField, setShakeField] = useState<string | null>(null);

    const SUBJECT_OPTIONS = [
        "Math", "English", "Science", "Social Studies", "SAT/ACT Prep", "Elementary", "Other"
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
        setShakeField(null);
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

        if (!formData.studentName.trim()) {
            newErrors.studentName = "Student name is required";
            setShakeField("studentName");
        }
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
            if (!shakeField) setShakeField("email");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email address";
            if (!shakeField) setShakeField("email");
        }

        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required";
            if (!shakeField) setShakeField("phone");
        }

        if (selectedSubjects.length === 0) {
            newErrors.subjects = "Please select at least one subject";
        }

        if (selectedSubjects.includes("Other") && !formData.otherSubject.trim()) {
            newErrors.otherSubject = "Please specify the other subject";
            if (!shakeField) setShakeField("otherSubject");
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setShakeField(null);

        if (!validate()) return;

        setStatus("loading");

        try {
            const finalSubjects = selectedSubjects.map(s => s === "Other" ? `Other: ${formData.otherSubject}` : s);

            const inquiryData = {
                studentName: formData.studentName,
                parentName: formData.parentName,
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

            await addDoc(collection(db, "inquiries"), inquiryData);

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
        <MotionSection id="contact" className="py-20 bg-secondary text-white relative overflow-hidden" variants={fadeUp}>
            {/* Top blobs that continue from previous section - positioned at top edge */}
            <motion.div
                className="absolute top-0 left-0 -ml-20 -mt-20 w-[500px] h-[500px] bg-red-100 rounded-full blur-3xl opacity-20"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.2 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            />
            <motion.div
                className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-200 rounded-full blur-3xl opacity-25"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.25 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <MotionDiv
                    className="text-center mb-12"
                    variants={fadeUp}
                    threshold={0.2}
                >
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
                        Get Started <span className="text-yellow-300">Today</span>
                    </h2>
                    <p className="text-lg text-gray-100">
                        Ready to see the difference personalized tutoring can make? Fill out the form to schedule your free consultation.
                    </p>
                </MotionDiv>

                <motion.div
                    className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl text-gray-900"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4 }}
                >
                    <AnimatePresence mode="wait">
                        {status === "success" ? (
                            <motion.div
                                key="success"
                                className="text-center py-12"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Confetti burst */}
                                {!shouldReduceMotion && (
                                    <div className="relative mb-4">
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-300 rounded-full"
                                                variants={confettiBurst}
                                                initial="hidden"
                                                animate="visible"
                                                transition={{ delay: i * 0.1 }}
                                                style={{
                                                    left: `${50 + (i % 2 === 0 ? -1 : 1) * (Math.floor(i / 2) + 1) * 10}%`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <motion.div
                                    className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                >
                                    <CheckCircle size={32} />
                                </motion.div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Inquiry Received!</h3>
                                <p className="text-gray-600 mb-6">
                                    Thank you for contacting AMK Tutors. We have sent a confirmation email to <strong>{formData.email}</strong> and will be in touch shortly.
                                </p>
                                <motion.button
                                    onClick={() => setStatus("idle")}
                                    className="px-6 py-2 bg-yellow-300 text-secondary rounded-lg font-medium hover:bg-yellow-400"
                                    whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                                >
                                    Send Another Inquiry
                                </motion.button>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                onSubmit={handleSubmit}
                                className="space-y-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                {/* Student & Parent Name */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name *</label>
                                        <motion.input
                                            type="text"
                                            name="studentName"
                                            value={formData.studentName}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${errors.studentName ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none transition-all`}
                                            placeholder="Student's Full Name"
                                            variants={shakeField === "studentName" ? shake : undefined}
                                            animate={shakeField === "studentName" ? "shake" : "rest"}
                                            whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                        />
                                        {errors.studentName && (
                                            <motion.p
                                                className="text-red-500 text-xs mt-1"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {errors.studentName}
                                            </motion.p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Name</label>
                                        <motion.input
                                            type="text"
                                            name="parentName"
                                            value={formData.parentName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none transition-all"
                                            placeholder="Parent's Name (Optional)"
                                            whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                        />
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                                        <motion.input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none transition-all`}
                                            placeholder="you@example.com"
                                            variants={shakeField === "email" ? shake : undefined}
                                            animate={shakeField === "email" ? "shake" : "rest"}
                                            whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                        />
                                        {errors.email && (
                                            <motion.p
                                                className="text-red-500 text-xs mt-1"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {errors.email}
                                            </motion.p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                        <motion.input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none transition-all`}
                                            placeholder="(555) 123-4567"
                                            variants={shakeField === "phone" ? shake : undefined}
                                            animate={shakeField === "phone" ? "shake" : "rest"}
                                            whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                        />
                                        {errors.phone && (
                                            <motion.p
                                                className="text-red-500 text-xs mt-1"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                {errors.phone}
                                            </motion.p>
                                        )}
                                    </div>
                                </div>

                                {/* Grade & Subjects */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Student Grade</label>
                                    <motion.select
                                        name="grade"
                                        value={formData.grade}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none bg-white transition-all"
                                        whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                    >
                                        <option value="K-5">K-5 Elementary</option>
                                        <option value="6">6th Grade</option>
                                        <option value="7">7th Grade</option>
                                        <option value="8">8th Grade</option>
                                        <option value="9">9th Grade</option>
                                        <option value="10">10th Grade</option>
                                        <option value="11">11th Grade</option>
                                        <option value="12">12th Grade</option>
                                    </motion.select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">Subjects of Interest *</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {SUBJECT_OPTIONS.map(subj => (
                                            <motion.button
                                                key={subj}
                                                type="button"
                                                onClick={() => toggleSubject(subj)}
                                                className={`px-3 py-2 text-sm rounded-lg border transition-all ${selectedSubjects.includes(subj)
                                                    ? 'bg-primary text-white border-primary shadow-md'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                                whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                                                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                                            >
                                                {subj}
                                            </motion.button>
                                        ))}
                                    </div>
                                    {errors.subjects && (
                                        <motion.p
                                            className="text-red-500 text-xs mt-1"
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            {errors.subjects}
                                        </motion.p>
                                    )}

                                    {/* Other Input */}
                                    <AnimatePresence>
                                        {selectedSubjects.includes("Other") && (
                                            <motion.div
                                                className="mt-3"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <motion.input
                                                    type="text"
                                                    name="otherSubject"
                                                    value={formData.otherSubject}
                                                    onChange={handleChange}
                                                    className={`w-full px-4 py-2 rounded-lg border ${errors.otherSubject ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-primary outline-none text-sm transition-all`}
                                                    placeholder="Please specify subject..."
                                                    variants={shakeField === "otherSubject" ? shake : undefined}
                                                    animate={shakeField === "otherSubject" ? "shake" : "rest"}
                                                    whileFocus={shouldReduceMotion ? undefined : { scale: 1.02 }}
                                                />
                                                {errors.otherSubject && (
                                                    <motion.p
                                                        className="text-red-500 text-xs mt-1"
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                    >
                                                        {errors.otherSubject}
                                                    </motion.p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Message (Optional)</label>
                                    <motion.textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none h-24 transition-all"
                                        placeholder="Tell us about the student's goals or specific needs..."
                                        whileFocus={shouldReduceMotion ? undefined : { scale: 1.01 }}
                                    />
                                </div>

                                {/* Global Error */}
                                <AnimatePresence>
                                    {status === "error" && (
                                        <motion.div
                                            className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                        >
                                            <AlertCircle size={16} />
                                            {errorMessage}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    type="submit"
                                    disabled={status === "loading"}
                                    className="w-full bg-yellow-300 text-secondary font-bold py-4 rounded-xl hover:bg-yellow-400 transition-colors shadow-lg text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    whileHover={shouldReduceMotion || status === "loading" ? undefined : { scale: 1.02, y: -2 }}
                                    whileTap={shouldReduceMotion || status === "loading" ? undefined : { scale: 0.98 }}
                                >
                                    {status === "loading" && <Loader2 className="animate-spin" />}
                                    {status === "loading" ? "Sending Inquiry..." : "Submit Inquiry"}
                                </motion.button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </MotionSection>
    );
}
