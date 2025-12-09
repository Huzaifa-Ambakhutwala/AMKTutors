"use client";

import { useState } from "react";

export default function ContactForm() {
    const [formData, setFormData] = useState({
        parentName: "",
        contactInfo: "",
        grade: "8", // Default based on analysis
        subject: "Math", // Default
        schedule: "",
    });

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setStatus("success");
                setFormData({
                    parentName: "",
                    contactInfo: "",
                    grade: "8",
                    subject: "Math",
                    schedule: "",
                });
                alert("Inquiry sent successfully! We will contact you shortly.");
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            console.error(error);
            setStatus("error");
            alert("Error sending inquiry. Please try again or email us directly at tutoring.amk@gmail.com");
        } finally {
            setStatus("idle");
        }
    };

    return (
        <section id="contact" className="py-20 bg-blue-600 text-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Get Started Today</h2>
                    <p className="text-lg text-blue-100">
                        Ready to see the difference personalized tutoring can make? Fill out the form to schedule your free consultation.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-12 shadow-2xl text-gray-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="parentName" className="block text-sm font-semibold text-gray-700 mb-2">Parent Name</label>
                            <input
                                type="text"
                                id="parentName"
                                name="parentName"
                                value={formData.parentName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label htmlFor="contactInfo" className="block text-sm font-semibold text-gray-700 mb-2">Email or Phone</label>
                            <input
                                type="text"
                                id="contactInfo"
                                name="contactInfo"
                                value={formData.contactInfo}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="grade" className="block text-sm font-semibold text-gray-700 mb-2">Student Grade</label>
                            <select
                                id="grade"
                                name="grade"
                                value={formData.grade}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="K-5">K-5</option>
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
                            <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">Subject of Interest</label>
                            <select
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                            >
                                <option value="Math">Math</option>
                                <option value="English">English</option>
                                <option value="Science">Science</option>
                                <option value="Social Studies">Social Studies</option>
                                <option value="Test Prep">Test Prep</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label htmlFor="schedule" className="block text-sm font-semibold text-gray-700 mb-2">Schedule Preference</label>
                        <input
                            type="text"
                            id="schedule"
                            name="schedule"
                            value={formData.schedule}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g., Weekdays after 4pm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full bg-primary text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {status === "loading" ? "Sending..." : "Submit Inquiry"}
                    </button>
                </form>
            </div>
        </section>
    );
}
