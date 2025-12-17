"use client";

import { ClipboardList, Users, TrendingUp, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionSection, MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { fadeUp, timelineFill } from "@/lib/motion/variants";

const steps = [
    {
        icon: ClipboardList,
        title: "Complete Evaluation",
        description: "Our comprehensive evaluation shows where your child stands academically, so we know exactly how to help him or her improve.",
    },
    {
        icon: Users,
        title: "Get 1:1 personalized tutoring",
        description: "We have expert tutors who understand your school's curriculum and create personalized learning plans for your child.",
    },
    {
        icon: TrendingUp,
        title: "See noticeable results",
        description: "Watch your child's confidence soar as they master difficult concepts, achieve higher grades, and develop a lifelong love for learning.",
    },
];

export default function HowItWorks() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <MotionSection className="py-20 bg-gray-50" variants={fadeUp}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-heading">How AMK Tutors Works</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Our proven process to help your child succeed.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Timeline line (desktop only) */}
                    <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gray-200" />
                    <motion.div
                        className="hidden md:block absolute top-12 left-0 h-0.5 bg-primary origin-left"
                        variants={shouldReduceMotion ? undefined : timelineFill}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    />

                    <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {steps.map((step, index) => (
                            <MotionItem key={index} className="relative h-full">
                                <motion.div
                                    className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100 h-full flex flex-col"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.4, delay: index * 0.15 }}
                                >
                                    <div className="bg-primary h-2 w-full relative">
                                        <motion.div
                                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary"
                                            initial={{ scale: 0 }}
                                            whileInView={{ scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.3, delay: index * 0.15 + 0.2 }}
                                        >
                                            <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor">
                                                <path d="M0 0L10 12L20 0H0Z" />
                                            </svg>
                                        </motion.div>
                                    </div>
                                    <div className="p-8 pt-12 text-center flex flex-col flex-1">
                                        <motion.div
                                            className="mx-auto bg-[#1A2742]/10 w-20 h-20 rounded-full flex items-center justify-center mb-6"
                                            whileHover={shouldReduceMotion ? undefined : { scale: 1.1, rotate: 5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <step.icon className="text-primary w-10 h-10" />
                                        </motion.div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                                            {step.title} <ArrowRight size={20} className="text-green-500" />
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed flex-1">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </MotionItem>
                        ))}
                    </MotionStagger>
                </div>
            </div>
        </MotionSection>
    );
}
