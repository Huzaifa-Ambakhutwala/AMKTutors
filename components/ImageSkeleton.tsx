"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface ImageSkeletonProps {
    className?: string;
}

export default function ImageSkeleton({ className }: ImageSkeletonProps) {
    const shouldReduceMotion = useReducedMotion();

    if (shouldReduceMotion) {
        return <div className={`bg-gray-200 animate-pulse ${className}`} />;
    }

    return (
        <motion.div
            className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`}
            animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
            }}
        />
    );
}

