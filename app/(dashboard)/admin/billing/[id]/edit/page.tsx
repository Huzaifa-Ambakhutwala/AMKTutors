"use client";

import RoleGuard from "@/components/RoleGuard";
import ArchivedBilling from "@/components/ArchivedBilling";

export default function EditBillingPage() {
  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <ArchivedBilling />
    </RoleGuard>
  );
}
