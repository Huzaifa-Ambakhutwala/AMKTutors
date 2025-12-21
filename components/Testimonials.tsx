"use client";

import { Star, Quote } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MotionSection, MotionStagger, MotionItem } from "@/lib/motion/Motion";
import { fadeUp, cardHover, scaleIn } from "@/lib/motion/variants";
import { GlowingEffect } from "@/components/ui/glowing-effect";

const testimonials = [
    {
        quote: "AMK Tutors has been a game-changer for my son. His math grades went from a C to an A in just one semester!",
        author: "Sarah J.",
        role: "Parent",
    },
    {
        quote: "The personalized attention my daughter receives is amazing. She actually looks forward to her tutoring sessions now.",
        author: "Michael T.",
        role: "Parent",
    },
    {
        quote: "Professional, reliable, and effective. We saw immediate improvements in study habits and confidence.",
        author: "Emily R.",
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
                                className="relative bg-secondary/50 p-8 rounded-xl border border-yellow-300/20"
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
                                <p className="text-gray-100 italic mb-6 relative z-10">"{testimonial.quote}"</p>
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
