"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, RefObject } from "react";
import { useInViewOnce } from "./useInViewOnce";
import {
  fadeUp,
  fadeIn,
  staggerContainer,
  staggerItem,
  scaleIn,
  slideIn,
  listStagger,
} from "./variants";
import type { Variants } from "framer-motion";

interface MotionSectionProps {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  id?: string;
  threshold?: number;
  rootMargin?: string;
}

export function MotionSection({
  children,
  variants = fadeUp,
  className,
  id,
  threshold = 0.1,
  rootMargin = "0px",
}: MotionSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ref, isInView } = useInViewOnce({ threshold, rootMargin });

  const motionVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : variants;

  return (
    <motion.section
      ref={ref as RefObject<HTMLElement>}
      id={id}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={motionVariants}
    >
      {children}
    </motion.section>
  );
}

interface MotionStaggerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function MotionStagger({
  children,
  className,
  staggerDelay = 0.1,
}: MotionStaggerProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ref, isInView } = useInViewOnce();

  const containerVariants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: staggerContainer.hidden,
        visible: {
          ...staggerContainer.visible,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      };

  return (
    <motion.div
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  );
}

interface MotionItemProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}

export function MotionItem({
  children,
  className,
  variants = staggerItem,
}: MotionItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : variants;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

// Motion wrapper for any element
interface MotionDivProps {
  children: ReactNode;
  className?: string;
  variants?: Variants;
  threshold?: number;
  rootMargin?: string;
}

export function MotionDiv({
  children,
  className,
  variants = fadeUp,
  threshold = 0.1,
  rootMargin = "0px",
}: MotionDivProps) {
  const shouldReduceMotion = useReducedMotion();
  const { ref, isInView } = useInViewOnce({ threshold, rootMargin });

  const motionVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : variants;

  return (
    <motion.div
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={motionVariants}
    >
      {children}
    </motion.div>
  );
}

