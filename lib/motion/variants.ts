import { Variants } from "framer-motion";

// Consistent transition settings
const defaultTransition = {
  duration: 0.4,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number], // easeOut
};

const fastTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

const slowTransition = {
  duration: 0.6,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

// Fade Up Animation
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

// Fade In Animation
export const fadeIn: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
};

// Stagger Container
export const staggerContainer: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Stagger Item
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

// Scale In Animation
export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
};

// Slide In Animation
export const slideIn: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: defaultTransition,
  },
};

// List Stagger (for checklists, etc.)
export const listStagger: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Draw SVG Animation
export const drawSvg: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1, ease: "easeInOut" },
      opacity: { duration: 0.3 },
    },
  },
};

// Timeline Fill Animation
export const timelineFill: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: {
      duration: 1.2,
      ease: "easeInOut",
    },
  },
};

// Word Stagger (for headlines)
export const wordStagger: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Word Item
export const wordItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: fastTransition,
  },
};

// Button Hover Variants
export const buttonHover = {
  scale: 1.02,
  y: -2,
  transition: fastTransition,
};

export const buttonTap = {
  scale: 0.98,
  y: 0,
};

// Card Hover Variants
export const cardHover = {
  y: -4,
  transition: fastTransition,
};

// Icon Wiggle
export const iconWiggle: Variants = {
  rest: {
    rotate: 0,
  },
  hover: {
    rotate: [0, -5, 5, -5, 0],
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

// Shake Animation (for form errors)
export const shake: Variants = {
  shake: {
    x: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
    },
  },
};

// Confetti Burst (lightweight)
export const confettiBurst: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: {
    opacity: [0, 1, 0],
    scale: [0, 1.2, 0],
    y: [0, -20],
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// Accordion Expand
export const accordionExpand: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};

// Checkmark Tick
export const checkmarkTick: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: "easeInOut" },
      opacity: { duration: 0.2 },
    },
  },
};

// Parallax (subtle)
export const parallax: Variants = {
  initial: {
    y: 0,
  },
  animate: {
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// Export transitions for reuse
export { defaultTransition, fastTransition, slowTransition };

