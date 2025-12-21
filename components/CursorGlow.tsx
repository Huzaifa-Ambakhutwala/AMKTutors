"use client";

import { useEffect, useState, useRef } from "react";

interface CursorGlowProps {
  glowSize?: number;
  glowIntensity?: number;
  glowColor?: string;
}

/**
 * Gets the background color of an element by checking its computed style
 * and traversing up the DOM tree if transparent
 */
function getBackgroundColor(element: Element | null): string | null {
  if (!element) return null;

  let current: Element | null = element;
  let depth = 0;
  const maxDepth = 8; // Increased depth to check more parent elements

  while (current && depth < maxDepth) {
    // Skip certain elements that shouldn't affect background detection
    const tagName = current.tagName.toLowerCase();
    if (tagName === "script" || tagName === "style" || tagName === "noscript") {
      current = current.parentElement;
      depth++;
      continue;
    }

    const style = window.getComputedStyle(current);
    const bgColor = style.backgroundColor;
    const bgImage = style.backgroundImage;

    // Check if background image exists (gradients, etc.)
    if (bgImage && bgImage !== "none" && bgImage !== "initial") {
      // If there's a gradient or image, check the background color as fallback
      // But also consider it as having a background
      if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
        const rgbMatch = bgColor.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
          const r = parseInt(rgbMatch[0]);
          const g = parseInt(rgbMatch[1]);
          const b = parseInt(rgbMatch[2]);
          const a = rgbMatch[3] ? parseFloat(rgbMatch[3]) : 1;
          const isWhite = r > 245 && g > 245 && b > 245;
          if (!isWhite && a > 0.05) {
            return bgColor;
          }
        }
      }
      // If gradient exists, assume it's a colored background (unless it's a white gradient)
      return bgColor || "rgba(128, 0, 0, 1)"; // Default to colored if gradient exists
    }

    // Check if background color is not transparent
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent" && bgColor !== "initial") {
      // Parse RGB values
      const rgbMatch = bgColor.match(/\d+/g);
      if (rgbMatch && rgbMatch.length >= 3) {
        const r = parseInt(rgbMatch[0]);
        const g = parseInt(rgbMatch[1]);
        const b = parseInt(rgbMatch[2]);
        const a = rgbMatch[3] ? parseFloat(rgbMatch[3]) : 1;

        // If it's not white/very light and has opacity, consider it a colored background
        // Using 245 instead of 240 to be more strict about white detection
        const isWhite = r > 245 && g > 245 && b > 245;
        if (!isWhite && a > 0.05) {
          return bgColor;
        }
      }
    }

    // Move to parent element
    current = current.parentElement;
    depth++;
  }

  return null;
}

/**
 * Checks if the element at the given coordinates has a colored background
 */
function hasColoredBackground(x: number, y: number): boolean {
  const element = document.elementFromPoint(x, y);
  if (!element) return false;

  // Skip pointer-events-none elements (like the glow itself)
  const style = window.getComputedStyle(element);
  if (style.pointerEvents === "none") {
    // Try to get the element behind it
    const rect = element.getBoundingClientRect();
    const behindElement = document.elementFromPoint(
      x,
      y + (rect.height || 1)
    );
    if (behindElement) {
      return hasColoredBackground(x, y + 1);
    }
    return false;
  }

  const bgColor = getBackgroundColor(element);
  if (!bgColor) return false;

  // Parse RGB to check if it's white or very light
  const rgbMatch = bgColor.match(/\d+/g);
  if (rgbMatch && rgbMatch.length >= 3) {
    const r = parseInt(rgbMatch[0]);
    const g = parseInt(rgbMatch[1]);
    const b = parseInt(rgbMatch[2]);

    // Consider backgrounds with RGB values less than 245 as "colored"
    // This excludes white (#FFFFFF = 255,255,255) and very light grays/backgrounds
    // Also excludes gray-50 (249, 250, 251) and similar light backgrounds
    const isWhiteOrLight = r > 245 && g > 245 && b > 245;
    return !isWhiteOrLight;
  }

  return true; // If we can't parse, assume it's colored (safer default)
}

export default function CursorGlow({
  glowSize = 300,
  glowIntensity = 0.3,
  glowColor = "rgba(255, 255, 255, 0.5)",
}: CursorGlowProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // Use requestAnimationFrame for smooth performance
      rafRef.current = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        setIsVisible(true);

        // Check if cursor is over a colored background
        const hasColor = hasColoredBackground(e.clientX, e.clientY);
        setShouldShow(hasColor);
      });
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setShouldShow(false);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] transition-opacity duration-300"
      style={{
        opacity: isVisible && shouldShow ? 1 : 0,
      }}
    >
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          left: mousePosition.x - glowSize / 2,
          top: mousePosition.y - glowSize / 2,
          width: glowSize,
          height: glowSize,
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: glowIntensity,
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
        }}
      />
    </div>
  );
}

