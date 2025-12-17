"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function SectionDivider() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="relative h-16 overflow-hidden">
            <motion.svg
                className="absolute bottom-0 w-full h-full"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                <motion.path
                    d="M0,60 Q300,20 600,60 T1200,60 L1200,120 L0,120 Z"
                    fill="currentColor"
                    className="text-gray-50"
                    variants={shouldReduceMotion ? undefined : {
                        hidden: { pathLength: 0, opacity: 0 },
                        visible: {
                            pathLength: 1,
                            opacity: 1,
                            transition: {
                                pathLength: { duration: 1, ease: "easeInOut" },
                                opacity: { duration: 0.5 },
                            },
                        },
                    }}
                />
            </motion.svg>
        </div>
    );
}

