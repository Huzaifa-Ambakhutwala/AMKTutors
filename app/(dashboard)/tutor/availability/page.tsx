"use client";

import RoleGuard from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogicalUserId } from "@/hooks/useProfile";
import { useTutorAvailability } from "@/hooks/useTutorAvailability";
import {
  RecurringAvailabilitySlot,
  AvailabilityBlock,
} from "@/lib/types";
import { Loader2, ArrowLeft, Plus, Trash2, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TutorAvailabilityPage() {
  const { profileId } = useUserRole();
  const queryClient = useQueryClient();
  const { logicalUserId: logicalTutorId, profileLoading } =
    useLogicalUserId(profileId);

  const { data: availability, isLoading: availabilityLoading } =
    useTutorAvailability(logicalTutorId);

  const [saving, setSaving] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [recurring, setRecurring] = useState<RecurringAvailabilitySlot[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);

  useEffect(() => {
    if (availability && !formReady) {
      setRecurring(availability.recurring);
      setBlocks(availability.blocks);
      setFormReady(true);
    }
  }, [availability, formReady]);

  const loading = profileLoading || availabilityLoading || !formReady || !logicalTutorId;

  const addRecurring = () => {
    setRecurring((prev) => [
      ...prev,
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
    ]);
  };

  const updateRecurring = <K extends keyof RecurringAvailabilitySlot>(
    index: number,
    field: K,
    value: RecurringAvailabilitySlot[K]
  ) => {
    setRecurring((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const removeRecurring = (index: number) => {
    setRecurring((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = () => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    setBlocks((prev) => [
      ...prev,
      { start: start.toISOString(), end: end.toISOString(), note: "Unavailable" },
    ]);
  };

  const updateBlock = <K extends keyof AvailabilityBlock>(
    index: number,
    field: K,
    value: AvailabilityBlock[K]
  ) => {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!logicalTutorId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "availability", logicalTutorId),
        {
          tutorId: logicalTutorId,
          recurring,
          blocks,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      queryClient.setQueryData(["availability", logicalTutorId], { recurring, blocks });
      toast.success("Availability saved.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={["TUTOR"]}>
        <div className="p-8 flex justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["TUTOR"]}>
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/tutor"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold font-heading">My Availability</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Set your recurring weekly hours and add one-off blocks when you’re unavailable (e.g. vacation).
        </p>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar size={20} /> Recurring weekly
            </h2>
            <button
              type="button"
              onClick={addRecurring}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> Add slot
            </button>
          </div>
          <div className="space-y-3">
            {recurring.map((slot, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl"
              >
                <select
                  value={slot.dayOfWeek}
                  onChange={(e) => updateRecurring(i, "dayOfWeek", parseInt(e.target.value, 10))}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  {DAYS.map((d, idx) => (
                    <option key={d} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500">from</span>
                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateRecurring(i, "startTime", e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateRecurring(i, "endTime", e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeRecurring(i)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove slot"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {recurring.length === 0 && (
              <p className="text-gray-500 text-sm">No recurring slots. Add one so admins can schedule within your hours.</p>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock size={20} /> Blocked dates
            </h2>
            <button
              type="button"
              onClick={addBlock}
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> Add block
            </button>
          </div>
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl"
              >
                <input
                  type="datetime-local"
                  value={block.start.slice(0, 16)}
                  onChange={(e) => updateBlock(i, "start", new Date(e.target.value).toISOString())}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="datetime-local"
                  value={block.end.slice(0, 16)}
                  onChange={(e) => updateBlock(i, "end", new Date(e.target.value).toISOString())}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={block.note || ""}
                  onChange={(e) => updateBlock(i, "note", e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm flex-1 min-w-[120px]"
                />
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  aria-label="Remove block"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={save}
          disabled={saving}
          className="w-full md:w-auto px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : null}
          Save availability
        </button>
      </div>
    </RoleGuard>
  );
}
