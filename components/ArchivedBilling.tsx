"use client";

import Link from "next/link";
import { Archive, ArrowLeft } from "lucide-react";

export default function ArchivedBilling() {
  return (
    <div className="max-w-lg mx-auto py-16 px-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
        <Archive className="w-8 h-8 text-gray-500" />
      </div>
      <h1 className="text-2xl font-bold font-heading text-gray-900 mb-2">
        Billing archived
      </h1>
      <p className="text-gray-600 mb-8">
        Billing and payroll are temporarily disabled to reduce database usage.
        Sessions and tutor tools remain available.
      </p>
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90"
      >
        <ArrowLeft size={18} />
        Go to Sessions
      </Link>
    </div>
  );
}
