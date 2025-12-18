"use client";

import Image from "next/image";
import { MotionSection, MotionDiv } from "@/lib/motion/Motion";
import { fadeUp, listStagger } from "@/lib/motion/variants";
import { motion } from "framer-motion";

export default function About() {
    return (
        <MotionSection id="about" className="py-20 bg-secondary text-white relative overflow-hidden" variants={fadeUp}>
            {/* Top blobs that continue from Attributes section */}
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        className="relative h-64 lg:h-96 w-full rounded-2xl overflow-hidden shadow-xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Image
                            src="/images/about-success-v2.png"
                            alt="Student success"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                    <div>
                        <MotionDiv variants={fadeUp} threshold={0.2}>
                            <h2 className="text-3xl font-bold text-white mb-6 font-heading">
                                Dedicated to Your <span className="text-yellow-300">Success</span>
                        </h2>
                        </MotionDiv>
                        <MotionDiv variants={fadeUp} threshold={0.2}>
                            <p className="text-lg text-gray-100 mb-6 leading-relaxed">
                            At AMK Tutors, we believe that every student has the potential to excel.
                            Our mission is to provide high-quality, personalized tutoring that builds confidence
                            and delivers tangible results.
                        </p>
                        </MotionDiv>
                        <MotionDiv variants={fadeUp} threshold={0.2}>
                            <p className="text-lg text-gray-100 mb-8 leading-relaxed">
                            Whether you need help with foundational math, advanced science, or preparing for
                            college entrance exams, our expert team is here to guide you every step of the way.
                        </p>
                        </MotionDiv>
                        <motion.ul
                            className="space-y-3 mb-8"
                            variants={listStagger}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                        >
                            {["One-on-one attention", "Proven teaching methods", "Supportive environment"].map((item, i) => (
                                <motion.li
                                    key={i}
                                    className="flex items-center text-gray-100"
                                    variants={fadeUp}
                                >
                                    <span className="w-2 h-2 bg-yellow-300 rounded-full mr-3"></span>
                                    {item}
                                </motion.li>
                            ))}
                        </motion.ul>
                    </div>
                </div>
            </div>
            {/* Bottom blobs positioned at edge for seamless transition */}
            <motion.div
                className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[500px] h-[500px] bg-red-200 rounded-full blur-3xl opacity-20"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.2 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            />
            <motion.div
                className="absolute bottom-0 right-0 -mr-20 -mb-20 w-96 h-96 bg-red-100 rounded-full blur-3xl opacity-25"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.25 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            />
        </MotionSection>
    );
}
