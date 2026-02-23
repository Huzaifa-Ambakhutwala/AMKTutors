"use client";

import { Search } from "lucide-react";

interface SearchFilterBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SearchFilterBar({
  placeholder = "Search...",
  value,
  onChange,
  className = "",
}: SearchFilterBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={18}
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 min-h-[44px] border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          aria-label="Clear search"
        >
          Clear
        </button>
      )}
    </div>
  );
}
