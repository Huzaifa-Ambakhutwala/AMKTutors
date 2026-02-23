"use client";

import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, collection, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Student,
  Session,
  ProgressGoal,
  ProgressMilestone,
  AssessmentScore,
} from "@/lib/types";
import { Loader2, ArrowLeft, Target, Award, BarChart2, Plus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import ProgressChart from "@/components/ProgressChart";
import type { ProgressDataPoint } from "@/components/ProgressChart";
import { toast } from "sonner";

export default function StudentProgressPage() {
  const { id } = useParams();
  const studentId = id as string;
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [goals, setGoals] = useState<ProgressGoal[]>([]);
  const [milestones, setMilestones] = useState<ProgressMilestone[]>([]);
  const [assessments, setAssessments] = useState<AssessmentScore[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const studentDoc = await getDoc(doc(db, "students", studentId));
        if (!studentDoc.exists()) {
          setStudent(null);
          setLoading(false);
          return;
        }
        setStudent({ id: studentDoc.id, ...studentDoc.data() } as Student);

        const [sessSnap, progressSnap] = await Promise.all([
          getDocs(collection(db, "sessions")),
          getDocs(collection(db, "students", studentId, "progress")),
        ]);
        const allSessions = sessSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Session))
          .filter((s) => s.studentId === studentId && s.status === "Completed");
        setSessions(allSessions);

        const goalsList: ProgressGoal[] = [];
        const milestonesList: ProgressMilestone[] = [];
        const assessmentsList: AssessmentScore[] = [];
        progressSnap.docs.forEach((d) => {
          const data = d.data();
          if (data.type === "goal") goalsList.push({ id: d.id, ...data } as ProgressGoal);
          else if (data.type === "milestone") milestonesList.push({ id: d.id, ...data } as ProgressMilestone);
          else if (data.type === "assessment") assessmentsList.push({ id: d.id, ...data } as AssessmentScore);
        });
        setGoals(goalsList.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
        setMilestones(milestonesList.sort((a, b) => (b.achievedAt || "").localeCompare(a.achievedAt || "")));
        setAssessments(assessmentsList.sort((a, b) => (a.date || "").localeCompare(b.date || "")));
      } catch (e) {
        console.error(e);
        toast.error("Failed to load progress");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  const chartData: ProgressDataPoint[] = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    assessments.forEach((a) => {
      const d = a.date.slice(0, 10);
      if (!byDate[d]) byDate[d] = {};
      const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : a.score;
      byDate[d][a.subject] = pct;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, subjects]) => ({ date, ...subjects }));
  }, [assessments]);

  const subjectsInChart = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => set.add(a.subject));
    return Array.from(set);
  }, [assessments]);

  const sessionsBySubject = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s) => {
      m[s.subject] = (m[s.subject] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  if (loading) {
    return (
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div className="p-12 flex justify-center">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </RoleGuard>
    );
  }
  if (!student) {
    return (
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div className="p-12 text-center text-red-500">Student not found</div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="max-w-full">
        <Link
          href={`/admin/students/${studentId}`}
          className="inline-flex items-center text-gray-500 hover:text-primary mb-4"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to {student.name}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">Progress</h1>
        <p className="text-gray-600 mb-6">{student.name} · {student.grade}</p>

        {/* Sessions by subject */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart2 size={20} /> Completed sessions by subject
          </h2>
          {sessionsBySubject.length === 0 ? (
            <p className="text-gray-500 text-sm">No completed sessions yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {sessionsBySubject.map(([subj, count]) => (
                <span
                  key={subj}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium"
                >
                  {subj}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assessment scores over time */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold mb-4">Assessment scores over time</h2>
          {chartData.length === 0 ? (
            <p className="text-gray-500 text-sm">No assessment scores recorded yet.</p>
          ) : (
            <ProgressChart data={chartData} subjects={subjectsInChart} valueLabel="Score %" />
          )}
        </div>

        {/* Goals */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target size={20} /> Learning goals
          </h2>
          {goals.length === 0 ? (
            <p className="text-gray-500 text-sm">No goals set yet.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g) => (
                <li
                  key={g.id || g.title + g.subject}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    g.completed ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div>
                    <span className="font-medium text-gray-900">{g.title}</span>
                    <span className="text-gray-500 text-sm ml-2">({g.subject})</span>
                    {g.targetDate && (
                      <span className="text-gray-400 text-xs ml-2">Target: {new Date(g.targetDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      g.completed ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {g.completed ? "Done" : "In progress"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Milestones */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Award size={20} /> Milestones
          </h2>
          {milestones.length === 0 ? (
            <p className="text-gray-500 text-sm">No milestones recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li
                  key={m.id || m.title + m.achievedAt}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100"
                >
                  <div>
                    <span className="font-medium text-gray-900">{m.title}</span>
                    <span className="text-gray-500 text-sm ml-2">({m.subject})</span>
                    {m.note && <p className="text-sm text-gray-600 mt-1">{m.note}</p>}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(m.achievedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <Link
            href={`/admin/students/${studentId}/progress/add`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus size={18} /> Add goal / milestone / assessment
          </Link>
        </div>
      </div>
    </RoleGuard>
  );
}
