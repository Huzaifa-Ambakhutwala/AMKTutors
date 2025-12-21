"use client";

import Link from "next/link";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { wordStagger, wordItem, buttonHover, buttonTap } from "@/lib/motion/variants";
import { MotionDiv } from "@/lib/motion/Motion";
import { useEffect, useState, useMemo } from "react";

export default function Hero() {
    const shouldReduceMotion = useReducedMotion();
    const [titleNumber, setTitleNumber] = useState(0);

    // Rotating phrases
    const rotatingTitles = useMemo(
        () => [
            "Learning That Fits",
            "Built Around Your Child",
            "One Student at a Time",
            "Tailored for Success",
            "Instruction That Adapts",
        ],
        []
    );

    useEffect(() => {
        if (shouldReduceMotion) return;
        const interval = setInterval(() => {
            setTitleNumber((prev) => {
                const next = prev + 1;
                return next >= rotatingTitles.length ? 0 : next;
            });
        }, 2200);
        return () => clearInterval(interval);
    }, [rotatingTitles.length, shouldReduceMotion]);

    // Split headline into words for stagger animation
    const headline1 = "Personalized Tutoring.";

    return (
        <section id="home" className="relative bg-secondary py-20 lg:py-32 overflow-hidden">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto">
                    {/* Headline with word stagger */}
                    <motion.div
                        className="inline-flex flex-col items-start mb-6"
                        variants={shouldReduceMotion ? undefined : wordStagger}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        <motion.h1
                            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-heading"
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
                        </motion.h1>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-yellow-300 tracking-tight font-heading relative h-[1.5em] min-w-[200px] overflow-visible">
                            {shouldReduceMotion ? (
                                <span className="inline-block">{rotatingTitles[0]}</span>
                            ) : (
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={titleNumber}
                                        className="absolute left-0 top-0 inline-block whitespace-nowrap"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ 
                                            duration: 0.5,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {rotatingTitles[titleNumber]}
                                    </motion.span>
                                </AnimatePresence>
                            )}
                        </h1>
                    </motion.div>

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
