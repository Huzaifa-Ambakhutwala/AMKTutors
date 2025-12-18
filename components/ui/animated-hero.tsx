"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);

  // ✅ Your exact rotation phrases
  const titles = useMemo(
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
    const interval = setInterval(() => {
      setTitleNumber((prev) => {
        const next = prev + 1;
        return next >= titles.length ? 0 : next;
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [titles.length]);

  return (
    <section className="w-full">
      {/* ✅ container + padding prevents "too wide" feel */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-8 py-16 sm:py-20 lg:py-28 text-center">
          <div>
            <Button variant="secondary" size="sm" className="gap-2">
              Read our launch article <MoveRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {/* ✅ max width keeps headline from stretching */}
            <h1 className="mx-auto max-w-3xl text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight">
              <span className="block text-muted-foreground">
                Personalized Tutoring.
              </span>

              {/* Rotating line */}
              <span className="relative mx-auto mt-3 block h-[1.5em] w-full max-w-2xl overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={titleNumber}
                    className="absolute inset-0 flex items-center justify-center font-bold"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      duration: 0.5,
                      ease: "easeInOut"
                    }}
                  >
                    {titles[titleNumber]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* ✅ max width for body copy */}
            <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              1:1 and small-group tutoring designed around your child's goals.
              Clear skill-building, consistent check-ins, and progress you can
              actually track.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="gap-2" variant="outline">
              Jump on a call <PhoneCall className="h-4 w-4" />
            </Button>
            <Button size="lg" className="gap-2">
              Sign up here <MoveRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Hero };

