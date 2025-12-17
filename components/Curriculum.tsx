"use client";

import { CheckCircle } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { MotionSection, MotionDiv } from "@/lib/motion/Motion";
import { fadeUp, listStagger, checkmarkTick } from "@/lib/motion/variants";

const curriculumPoints = [
    {
        title: "TEKS & Common Core Aligned",
        description: "Our materials cover all essential standards for Texas and national curricula.",
    },
    {
        title: "Personalized Learning Plans",
        description: "Every student gets a customized roadmap based on their initial evaluation.",
    },
    {
        title: "Progress Tracking",
        description: "Regular updates and reports to keep parents informed of improvements.",
    },
];

export default function Curriculum() {
    return (
        <MotionSection id="curriculum" className="py-20 bg-gray-50" variants={fadeUp}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <MotionDiv variants={fadeUp} threshold={0.2}>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6 font-heading">
                                Our Curriculum Approach
                            </h2>
                        </MotionDiv>
                        <MotionDiv variants={fadeUp} threshold={0.2}>
                            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                We align our tutoring with state and national standards to ensure that students
                                are not only improving their grades but also mastering the core concepts required for long-term success.
                            </p>
                        </MotionDiv>
                        <motion.div
                            className="space-y-4"
                            variants={listStagger}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                        >
                            {curriculumPoints.map((point, index) => (
                                <motion.div
                                    key={index}
                                    className="flex items-start"
                                    variants={fadeUp}
                                >
                                    <motion.div
                                        className="mt-1 mr-3 flex-shrink-0"
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                    >
                                        <CheckCircle className="text-primary" size={24} />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{point.title}</h3>
                                        <p className="text-gray-600">{point.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                    <motion.div
                        className="relative h-80 w-full rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Image
                            src="/images/curriculum.png"
                            alt="Curriculum Approach"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                </div>
            </div>
        </MotionSection>
    );
}
