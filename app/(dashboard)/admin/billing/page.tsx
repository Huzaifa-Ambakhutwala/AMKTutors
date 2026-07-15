"use client";

import RoleGuard from "@/components/RoleGuard";
import ArchivedBilling from "@/components/ArchivedBilling";

export default function BillingPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <ArchivedBilling />
    </RoleGuard>
  );
}
