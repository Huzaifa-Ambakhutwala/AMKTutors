"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOnceOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useInViewOnce(options: UseInViewOnceOptions = {}) {
  const { threshold = 0.1, rootMargin = "0px", once = true } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isInView };
}

