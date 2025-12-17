"use client";

import { BookOpen, Calculator, FlaskConical, Globe } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionSection, MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { fadeUp, cardHover } from "@/lib/motion/variants";

const subjects = [
    {
        icon: Calculator,
        title: "Math",
        description: "From Algebra to Calculus, we help students master complex concepts with ease.",
    },
    {
        icon: BookOpen,
        title: "English",
        description: "Improving reading comprehension, writing skills, and grammar for all grade levels.",
    },
    {
        icon: FlaskConical,
        title: "Science",
        description: "Comprehensive support for Biology, Chemistry, Physics, and General Science.",
    },
    {
        icon: Globe,
        title: "Social Studies",
        description: "Exploring History, Geography, and Civics to build a strong understanding of the world.",
    },
];

export default function Subjects() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <MotionSection id="subjects" className="py-20 bg-white" variants={fadeUp}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">
                        Subjects We <span className="text-secondary">Offer</span>
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Comprehensive tutoring across core subjects to support your academic journey.
                    </p>
                </motion.div>

                <MotionStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {subjects.map((subject, index) => (
                        <MotionItem key={index} className="h-full">
                            <motion.div
                                className="bg-white border-2 border-gray-100 p-8 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 group h-full flex flex-col hover:border-yellow-300"
                                whileHover={shouldReduceMotion ? undefined : { ...cardHover, rotateY: 2 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    className="bg-yellow-300 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-secondary transition-colors"
                                    whileHover={shouldReduceMotion ? undefined : { scale: 1.1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <subject.icon className="text-secondary w-7 h-7 group-hover:text-yellow-300 transition-colors" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{subject.title}</h3>
                                <p className="text-gray-600 leading-relaxed flex-1">
                                    {subject.description}
                                </p>
                            </motion.div>
                        </MotionItem>
                    ))}
                </MotionStagger>
            </div>
        </MotionSection>
    );
}
