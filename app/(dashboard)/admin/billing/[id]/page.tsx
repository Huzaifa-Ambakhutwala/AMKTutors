"use client";

import RoleGuard from "@/components/RoleGuard";
import ArchivedBilling from "@/components/ArchivedBilling";

export default function BillingDetailPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <ArchivedBilling />
    </RoleGuard>
  );
}
