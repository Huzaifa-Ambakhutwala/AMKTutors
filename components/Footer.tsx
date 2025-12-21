"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/motion/variants";

export default function Footer() {
    return (
        <motion.footer
            className="bg-white text-gray-700 py-12 border-t-4 border-secondary relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeIn}
        >

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                <motion.div
                    className="mb-4 flex justify-center"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                    <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-yellow-300">
                        <Image src="/logo.png" alt="AMK Tutors Logo" width={60} height={60} className="w-16 h-16 object-contain" />
                    </div>
                </motion.div>
                <p className="mb-8 font-medium text-gray-800">
                    Empowering students to reach their <span className="text-secondary font-bold">full potential</span>.
                </p>
                <div className="border-t-2 border-yellow-300/30 pt-8 text-sm">
                    <p className="text-gray-600">
                        &copy; {new Date().getFullYear()} <span className="text-secondary font-semibold">AMK Tutors</span>. All rights reserved.
                    </p>
                </div>
            </div>
        </motion.footer>
    );
}
