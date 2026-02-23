"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "sonner";

type Tab = "goal" | "milestone" | "assessment";

export default function AddProgressPage() {
  const { id } = useParams();
  const router = useRouter();
  const studentId = id as string;
  const [tab, setTab] = useState<Tab>("goal");
  const [saving, setSaving] = useState(false);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalSubject, setGoalSubject] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalCompleted, setGoalCompleted] = useState(false);

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneSubject, setMilestoneSubject] = useState("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [milestoneAchievedAt, setMilestoneAchievedAt] = useState(() => new Date().toISOString().slice(0, 10));

  const [assessSubject, setAssessSubject] = useState("");
  const [assessName, setAssessName] = useState("");
  const [assessScore, setAssessScore] = useState("");
  const [assessMaxScore, setAssessMaxScore] = useState("");
  const [assessDate, setAssessDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalSubject.trim()) {
      toast.error("Title and subject required");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "students", studentId, "progress"), {
        type: "goal",
        studentId,
        subject: goalSubject.trim(),
        title: goalTitle.trim(),
        targetDate: goalTargetDate || null,
        completed: goalCompleted,
        completedAt: goalCompleted ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      });
      toast.success("Goal added");
      router.push(`/admin/students/${studentId}/progress`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !milestoneSubject.trim()) {
      toast.error("Title and subject required");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "students", studentId, "progress"), {
        type: "milestone",
        studentId,
        subject: milestoneSubject.trim(),
        title: milestoneTitle.trim(),
        achievedAt: milestoneAchievedAt || new Date().toISOString(),
        note: milestoneNote.trim() || null,
        createdAt: new Date().toISOString(),
      });
      toast.success("Milestone added");
      router.push(`/admin/students/${studentId}/progress`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to add milestone");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const score = parseFloat(assessScore);
    if (!assessSubject.trim() || !assessName.trim() || isNaN(score)) {
      toast.error("Subject, name, and numeric score required");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "students", studentId, "progress"), {
        type: "assessment",
        studentId,
        subject: assessSubject.trim(),
        assessmentName: assessName.trim(),
        score,
        maxScore: assessMaxScore ? parseFloat(assessMaxScore) : null,
        date: assessDate,
        createdAt: new Date().toISOString(),
      });
      toast.success("Assessment score added");
      router.push(`/admin/students/${studentId}/progress`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to add assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="max-w-lg">
        <Link
          href={`/admin/students/${studentId}/progress`}
          className="inline-flex items-center text-gray-500 hover:text-primary mb-4"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to progress
        </Link>
        <h1 className="text-xl font-bold mb-4">Add progress entry</h1>

        <div className="flex gap-2 mb-6">
          {(["goal", "milestone", "assessment"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                tab === t ? "bg-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "goal" && (
          <form onSubmit={handleAddGoal} className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal title</label>
              <input
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Master quadratic equations"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={goalSubject}
                onChange={(e) => setGoalSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Math"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target date (optional)</label>
              <input
                type="date"
                value={goalTargetDate}
                onChange={(e) => setGoalTargetDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={goalCompleted} onChange={(e) => setGoalCompleted(e.target.checked)} />
              <span className="text-sm">Completed</span>
            </label>
            <button type="submit" disabled={saving} className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Add goal"}
            </button>
          </form>
        )}

        {tab === "milestone" && (
          <form onSubmit={handleAddMilestone} className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Milestone title</label>
              <input
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. First A on a test"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={milestoneSubject}
                onChange={(e) => setMilestoneSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Math"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achieved at</label>
              <input
                type="date"
                value={milestoneAchievedAt}
                onChange={(e) => setMilestoneAchievedAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea
                value={milestoneNote}
                onChange={(e) => setMilestoneNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Add milestone"}
            </button>
          </form>
        )}

        {tab === "assessment" && (
          <form onSubmit={handleAddAssessment} className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={assessSubject}
                onChange={(e) => setAssessSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Math"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment name</label>
              <input
                value={assessName}
                onChange={(e) => setAssessName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="e.g. Chapter 5 quiz"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                <input
                  type="number"
                  step="any"
                  value={assessScore}
                  onChange={(e) => setAssessScore(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max score (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={assessMaxScore}
                  onChange={(e) => setAssessMaxScore(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={assessDate}
                onChange={(e) => setAssessDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <button type="submit" disabled={saving} className="w-full py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Add assessment score"}
            </button>
          </form>
        )}
      </div>
    </RoleGuard>
  );
}
