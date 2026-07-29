"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useLogicalUserId } from "@/hooks/useProfile";
import {
  useParentStudentIds,
  useParentUpcomingSessions,
  refreshParentUpcoming,
} from "@/hooks/useSessions";
import { Session } from "@/lib/types";
import {
  fetchPastSessionsPageForStudentIds,
  HISTORY_PAGE_SIZE,
} from "@/lib/sessions-query";
import FirestoreErrorBanner from "@/components/FirestoreErrorBanner";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  X,
  LogOut,
  FileText,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SessionFeedback from "@/components/SessionFeedback";

type Tab = "upcoming" | "history";

export default function ParentDashboard() {
  const { profileId, loading: roleLoading } = useUserRole();
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logicalUserId: logicalParentId, profile, profileLoading } =
    useLogicalUserId(profileId);

  const {
    data: studentIds = [],
    isLoading: studentsLoading,
    error: studentsError,
  } = useParentStudentIds(logicalParentId);

  const {
    data: upcomingRaw = [],
    isLoading: sessionsLoading,
    isFetching,
    error: sessionsError,
    refetch,
  } = useParentUpcomingSessions(logicalParentId, studentIds, {
    enabled: !roleLoading && !!logicalParentId && studentIds.length > 0,
  });

  const upcomingSessions = upcomingRaw.map((s) => ({ ...s, internalNotes: null }));

  const [tab, setTab] = useState<Tab>("upcoming");
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const loading =
    roleLoading ||
    profileLoading ||
    studentsLoading ||
    (studentIds.length > 0 && sessionsLoading);

  const loadHistory = async (append = false) => {
    if (studentIds.length === 0) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { sessions, nextCursor } = await fetchPastSessionsPageForStudentIds(
        studentIds,
        { beforeStartTime: append ? historyCursor ?? undefined : undefined }
      );
      const sanitized = sessions.map((s) => ({ ...s, internalNotes: null }));
      setHistorySessions((prev) => (append ? [...prev, ...sanitized] : sanitized));
      setHistoryCursor(nextCursor);
      setHistoryLoaded(true);
    } catch (e) {
      setHistoryError(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (next: Tab) => {
    setTab(next);
    if (next === "history" && !historyLoaded) void loadHistory(false);
  };

  const handleRefresh = async () => {
    if (!logicalParentId || studentIds.length === 0) return;
    await refreshParentUpcoming(logicalParentId, studentIds, queryClient);
    if (tab === "history") {
      setHistoryCursor(null);
      await loadHistory(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const displayError = studentsError ?? (tab === "upcoming" ? sessionsError : historyError);
  const sessionsWithFeedback = historySessions
    .filter((s) => s.parentFeedback?.text)
    .slice(0, 5);

  const renderSessionTable = (list: Session[]) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 md:px-6 py-4 text-gray-700">Student</th>
              <th className="px-4 md:px-6 py-4 text-gray-700">Tutor</th>
              <th className="px-4 md:px-6 py-4 text-gray-700">Subject</th>
              <th className="px-4 md:px-6 py-4 text-gray-700">Time</th>
              <th className="px-4 md:px-6 py-4 text-gray-700">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 md:px-6 py-4 font-medium">{s.studentName}</td>
                <td className="px-4 md:px-6 py-4">{s.tutorName}</td>
                <td className="px-4 md:px-6 py-4">{s.subject}</td>
                <td className="px-4 md:px-6 py-4 text-sm">
                  {new Date(s.startTime).toLocaleString()}
                </td>
                <td className="px-4 md:px-6 py-4">
                  {s.parentFeedback ? (
                    <button
                      onClick={() => setSelectedSession(s)}
                      className="text-purple-600 hover:bg-purple-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <MessageSquare size={16} /> View
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm italic">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <RoleGuard allowedRoles={["PARENT"]}>
      <div className="p-4 md:p-8 relative max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold font-heading">Parent Portal</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-primary font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} /> Website
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>

        <Link
          href="/parent/invoices"
          className="flex items-center gap-4 p-4 mb-8 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 hover:shadow-md transition-all max-w-md"
        >
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="text-primary" size={24} />
          </div>
          <div>
            <p className="font-bold text-gray-900">My Invoices</p>
            <p className="text-sm text-gray-500">View and track your invoices</p>
          </div>
        </Link>

        <FirestoreErrorBanner
          error={displayError}
          onRetry={() => (tab === "upcoming" ? refetch() : loadHistory(false))}
        />

        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("upcoming")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === "upcoming"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("history")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === "history"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              History
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || isFetching || historyLoading || studentIds.length === 0}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RotateCcw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {tab === "upcoming" && loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : tab === "upcoming" ? (
          studentIds.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No students linked to this account.</p>
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No upcoming sessions.</p>
            </div>
          ) : (
            renderSessionTable(upcomingSessions)
          )
        ) : historyLoading && !historyLoaded ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {sessionsWithFeedback.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={20} /> Recent feedback
                </h2>
                <div className="space-y-2">
                  {sessionsWithFeedback.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-purple-200 hover:bg-purple-50/30 transition-colors"
                    >
                      <p className="font-bold text-gray-900">
                        {s.studentName} – {s.subject}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {s.parentFeedback?.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {historySessions.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No past sessions.</p>
              </div>
            ) : (
              renderSessionTable(historySessions)
            )}
            {historyCursor && (
              <button
                type="button"
                onClick={() => void loadHistory(true)}
                disabled={historyLoading}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {historyLoading ? "Loading…" : `Load more (${HISTORY_PAGE_SIZE})`}
              </button>
            )}
          </>
        )}

        {selectedSession && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Session Feedback</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-bold text-gray-900">{selectedSession.studentName}</p>
                <p className="text-sm text-gray-500">
                  {new Date(selectedSession.startTime).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">{selectedSession.subject}</p>
              </div>
              <SessionFeedback
                session={selectedSession}
                userRole="PARENT"
                userProfile={profile ?? null}
              />
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
