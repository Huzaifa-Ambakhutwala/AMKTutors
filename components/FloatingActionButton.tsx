"use client";

import Link from "next/link";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  href: string;
  label: string;
  className?: string;
}

export default function FloatingActionButton({ href, label, className }: FloatingActionButtonProps) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <Link
      href={href}
      className={cn(
        "fixed bottom-20 right-4 z-40 flex items-center justify-center gap-2",
        "w-14 h-14 rounded-full shadow-lg text-white font-semibold",
        "bg-primary hover:bg-primary/90 active:scale-95 transition-all",
        "safe-area-inset-bottom",
        className
      )}
      aria-label={label}
    >
      <span className="text-2xl leading-none">+</span>
    </Link>
  );
}
