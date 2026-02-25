"use client";

import RoleGuard from "@/components/RoleGuard";
import NotificationSettingsPanel from "@/components/NotificationSettingsPanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ParentNotificationsPage() {
  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/parent"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-heading">
              Notification settings
            </h1>
            <p className="text-sm text-gray-500">
              Choose how you’d like to be notified.
            </p>
          </div>
        </div>
        <NotificationSettingsPanel />
      </div>
    </RoleGuard>
  );
}

