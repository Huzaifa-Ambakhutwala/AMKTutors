"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { wordStagger, wordItem, buttonHover, buttonTap } from "@/lib/motion/variants";
import { MotionDiv } from "@/lib/motion/Motion";

export default function Hero() {
    const shouldReduceMotion = useReducedMotion();
    const { scrollY } = useScroll();
    
    // Subtle parallax for background blobs (disabled for reduced motion)
    const blob1Y = shouldReduceMotion ? 0 : useTransform(scrollY, [0, 500], [0, 50]);
    const blob2Y = shouldReduceMotion ? 0 : useTransform(scrollY, [0, 500], [0, -30]);

    // Split headline into words for stagger animation
    const headline1 = "Personalized Tutoring.";
    const headline2 = "Trusted Results.";

    return (
        <section id="home" className="relative bg-secondary py-20 lg:py-32 overflow-hidden">
            {/* Background blobs with subtle parallax - extend beyond section */}
            <motion.div
                className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-red-200 rounded-full blur-3xl opacity-30"
                style={{ y: blob1Y }}
            />
            <motion.div
                className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-red-100 rounded-full blur-3xl opacity-30"
                style={{ y: blob2Y }}
            />
            {/* Bottom blob positioned at edge for seamless transition */}
            <motion.div
                className="absolute bottom-0 right-0 -mr-20 -mb-20 w-[500px] h-[500px] bg-red-200 rounded-full blur-3xl opacity-20"
                style={{ y: shouldReduceMotion ? 0 : useTransform(scrollY, [0, 500], [0, 30]) }}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto">
                    {/* Headline with word stagger */}
                    <motion.h1
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 font-heading"
                        variants={shouldReduceMotion ? undefined : wordStagger}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        {headline1.split(" ").map((word, i) => (
                            <motion.span
                                key={i}
                                variants={shouldReduceMotion ? undefined : wordItem}
                                className="inline-block mr-2"
                            >
                                {word}
                            </motion.span>
                        ))}
                        <br className="hidden md:block" />
                        <motion.span
                            className="text-yellow-300 inline-block"
                            variants={shouldReduceMotion ? undefined : wordItem}
                        >
                            {headline2.split(" ").map((word, i) => (
                                <motion.span
                                    key={i}
                                    variants={shouldReduceMotion ? undefined : wordItem}
                                    className="inline-block mr-2"
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </motion.span>
                    </motion.h1>

                    {/* Description */}
                    <MotionDiv
                        className="text-lg md:text-xl text-gray-100 mb-10 leading-relaxed"
                        threshold={0.2}
                    >
                        Expert tutors dedicated to helping students excel in Math, English, Science, and more.
                        Tailored learning plans for every student's unique needs.
                    </MotionDiv>

                    {/* CTA Buttons with micro-interactions */}
                    <MotionDiv
                        className="flex flex-col sm:flex-row justify-center gap-4"
                        threshold={0.2}
                    >
                        <motion.div
                            whileHover={shouldReduceMotion ? undefined : buttonHover}
                            whileTap={shouldReduceMotion ? undefined : buttonTap}
                        >
                        <Link
                            href="#contact"
                                className="bg-yellow-300 text-secondary px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow block hover:bg-yellow-400"
                        >
                            Book a Call Today
                        </Link>
                        </motion.div>
                        <motion.div
                            whileHover={shouldReduceMotion ? undefined : buttonHover}
                            whileTap={shouldReduceMotion ? undefined : buttonTap}
                        >
                        <Link
                            href="#about"
                                className="bg-white text-secondary border-2 border-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md block"
                        >
                            Learn More
                        </Link>
                        </motion.div>
                    </MotionDiv>
                </div>
            </div>
        </section>
    );
}
