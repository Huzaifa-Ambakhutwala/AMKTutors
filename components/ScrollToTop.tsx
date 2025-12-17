"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
    const shouldReduceMotion = useReducedMotion();
    const { scrollY } = useScroll();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = scrollY.on("change", (latest) => {
            setIsVisible(latest > 300);
        });
        return () => unsubscribe();
    }, [scrollY]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
    };

    return (
        <motion.button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 bg-yellow-300 text-secondary p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow hover:bg-yellow-400"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0,
            }}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.1, y: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.2 }}
            aria-label="Scroll to top"
        >
            <ArrowUp size={20} />
        </motion.button>
    );
}

