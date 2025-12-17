"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/motion/variants";

export default function Footer() {
    return (
        <motion.footer
            className="bg-gray-900 text-gray-400 py-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeIn}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    className="mb-4 flex justify-center"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                    <div className="bg-white p-3 rounded-xl shadow-lg">
                        <Image src="/logo.png" alt="AMK Tutors Logo" width={60} height={60} className="w-16 h-16 object-contain" />
                    </div>
                </motion.div>
                <p className="mb-8 font-medium">Empowering students to reach their full potential.</p>
                <div className="border-t border-gray-800 pt-8 text-sm">
                    &copy; {new Date().getFullYear()} AMK Tutors. All rights reserved.
                </div>
            </div>
        </motion.footer>
    );
}
