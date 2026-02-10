"use client";

import { Star, Quote } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionSection, MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { fadeUp, cardHover, scaleIn } from "@/lib/motion/variants";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const testimonials = [
    {
        quote: "We’ve had a great experience with AMK Tutors for my son. The tutor is always on time, responsible, and comes with a very positive attitude. They are patient, supportive, and truly invested in my son’s learning and progress. We really appreciate their professionalism and dedication, and we’re very happy with the results so far.",
        author: "Sonjoy Karmokar",
        role: "Parent",
    },
    {
        quote: "We have had a wonderful experience with AMK Tutors. Khadijah is kind, patient and has been such a great help to our son with Algebra I. She is easy to schedule with, always prepared and flexible when needed. Highly recommend!",
        author: "Kelly Pitre",
        role: "Parent",
    },
    {
        quote: "AMK Tutors has been awesome for my 8th grader. Math was getting pretty stressful, especially with Algebra, but the tutor breaks things down in a way that finally clicks. My kid actually feels comfortable asking questions now, which is a big deal for us. They’re super easy to work with and flexible about meeting at the library or at home. We’ve definitely seen better grades and a lot more confidence since starting sessions. Really happy we found them!",
        author: "Max Kapoor",
        role: "Parent",
    },
];

export default function Testimonials() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <MotionSection id="testimonials" className="py-20 bg-secondary text-white relative overflow-hidden" variants={fadeUp}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.4 }}
                >
                    <h2 className="text-3xl font-bold text-white mb-4 font-heading">
                        Parent <span className="text-yellow-300">Testimonials</span>
                    </h2>
                    <p className="text-lg text-gray-100">See what families are saying about AMK Tutors.</p>
                </motion.div>
                <MotionStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <MotionItem key={index}>
                            <motion.div
                                className="relative bg-secondary/50 p-8 rounded-xl border border-yellow-300/20 h-full flex flex-col"
                                whileHover={shouldReduceMotion ? undefined : cardHover}
                                transition={{ duration: 0.2 }}
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
                                {/* Quote mark animation */}
                                <motion.div
                                    className="absolute -top-2 -left-2 text-yellow-300/30"
                                    initial={{ scale: 0, rotate: -180 }}
                                    whileInView={{ scale: 1, rotate: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                >
                                    <Quote size={40} />
                                </motion.div>
                                <div className="text-yellow-300 flex mb-4 relative z-10">
                                {[...Array(5)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 0.2, delay: index * 0.1 + i * 0.05 }}
                                        >
                                            <Star size={20} fill="currentColor" />
                                        </motion.div>
                                ))}
                            </div>
                                <p className="text-gray-100 italic mb-6 relative z-10 flex-1">"{testimonial.quote}"</p>
                            <div className="relative z-10">
                                    <p className="font-bold text-white">{testimonial.author}</p>
                                    <p className="text-sm text-gray-200">{testimonial.role}</p>
                            </div>
                            </motion.div>
                        </MotionItem>
                    ))}
                </MotionStagger>
            </div>
        </MotionSection>
    );
}
