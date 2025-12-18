"use client";

import { Calendar, GraduationCap, ClipboardList } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { iconWiggle, cardHover } from "@/lib/motion/variants";

const attributes = [
    {
        icon: GraduationCap,
        title: "Expert Tutors",
        description: "Our tutors are highly qualified professionals with years of experience in their respective fields.",
    },
    {
        icon: ClipboardList,
        title: "Personalized Plans",
        description: "We create customized learning paths tailored to each student's unique strengths and needs.",
    },
    {
        icon: Calendar,
        title: "Flexible Scheduling",
        description: "Sessions that fit your busy lifestyle. Online or in-person options available at your convenience.",
    },
];

export default function Attributes() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <section className="py-16 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {attributes.map((attr, index) => (
                        <MotionItem key={index}>
                            <motion.div
                                className="flex flex-col items-center text-center p-6 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100"
                                whileHover={shouldReduceMotion ? undefined : cardHover}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.div
                                    className="bg-yellow-300 p-4 rounded-full mb-4 text-secondary"
                                    variants={shouldReduceMotion ? undefined : iconWiggle}
                                    initial="rest"
                                    whileHover="hover"
                                >
                                <attr.icon size={32} />
                                </motion.div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{attr.title}</h3>
                            <p className="text-gray-600">{attr.description}</p>
                            </motion.div>
                        </MotionItem>
                    ))}
                </MotionStagger>
            </div>
        </section>
    );
}
