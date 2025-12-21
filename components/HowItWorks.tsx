"use client";

import { ClipboardList, Users, TrendingUp, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionSection, MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { fadeUp, timelineFill } from "@/lib/motion/variants";
import { GlowingEffect } from "@/components/ui/glowing-effect";

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
        <MotionSection className="py-20 bg-secondary text-white relative overflow-hidden" variants={fadeUp}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-heading">
                        How AMK Tutors <span className="text-yellow-300">Works</span>
                    </h2>
                    <p className="text-lg text-gray-100 max-w-2xl mx-auto">
                        Our proven process to help your child succeed.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Timeline line (desktop only) */}
                    <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-yellow-300/30" />
                    <motion.div
                        className="hidden md:block absolute top-12 left-0 h-0.5 bg-yellow-300 origin-left"
                        variants={shouldReduceMotion ? undefined : timelineFill}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    />

                    <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {steps.map((step, index) => (
                            <MotionItem key={index} className="relative h-full">
                                <motion.div
                                    className="relative bg-secondary/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-yellow-300/20 h-full flex flex-col"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.4, delay: index * 0.15 }}
                                    whileHover={shouldReduceMotion ? undefined : { y: -5 }}
                                >
                                    <GlowingEffect
                                        spread={40}
                                        glow={true}
                                        disabled={false}
                                        proximity={64}
                                        inactiveZone={0.2}
                                        borderWidth={2}
                                        variant="white"
                                    />
                                    {/* Card Header with Icon */}
                                    <div className="p-6 pb-4 relative z-10">
                                        <motion.div
                                            className="w-16 h-16 bg-yellow-300 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                                            whileHover={shouldReduceMotion ? undefined : { scale: 1.1, rotate: 5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <step.icon className="text-secondary w-8 h-8" />
                                        </motion.div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-xl font-bold text-white">
                                                {step.title}
                                            </h3>
                                            <ArrowRight size={18} className="text-yellow-300 flex-shrink-0" />
                                        </div>
                                    </div>
                                    
                                    {/* Card Content */}
                                    <div className="px-6 pb-6 flex flex-col flex-1 relative z-10">
                                        <p className="text-gray-100 leading-relaxed text-sm">
                                            {step.description}
                                        </p>
                                    </div>
                                    
                                    {/* Step Number Badge */}
                                    <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-300/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-yellow-300/30 relative z-10">
                                        <span className="text-yellow-300 font-bold text-sm">{index + 1}</span>
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
