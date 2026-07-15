"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, resolveLogicalUserId } from "@/hooks/useProfile";
import {
  useTutorUpcomingSessions,
  refreshTutorUpcoming,
} from "@/hooks/useSessions";
import { Session } from "@/lib/types";
import {
  fetchPastSessionsPageForTutor,
  HISTORY_PAGE_SIZE,
} from "@/lib/sessions-query";
import FirestoreErrorBanner from "@/components/FirestoreErrorBanner";
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  LogOut,
  CheckCircle,
  MapPin,
  StickyNote,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ManageSessionModal from "@/components/ManageSessionModal";

type Tab = "upcoming" | "history";

export default function TutorDashboard() {
  const { user, profileId } = useUserRole();
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(profileId);
  const logicalTutorId = profileId
    ? resolveLogicalUserId(profileId, profile ?? null)
    : null;

  const {
    data: upcomingSessions = [],
    isLoading,
    isFetching,
    error: upcomingError,
    refetch,
  } = useTutorUpcomingSessions(logicalTutorId, { enabled: !!user && !!logicalTutorId });

  const [tab, setTab] = useState<Tab>("upcoming");
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [managingSession, setManagingSession] = useState<Session | null>(null);

  const loadHistory = async (append = false) => {
    if (!logicalTutorId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const { sessions, nextCursor } = await fetchPastSessionsPageForTutor(
        logicalTutorId,
        {
          beforeStartTime: append ? historyCursor ?? undefined : undefined,
        }
      );
      setHistorySessions((prev) => (append ? [...prev, ...sessions] : sessions));
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
    if (next === "history" && !historyLoaded) {
      void loadHistory(false);
    }
  };

  const handleRefresh = async () => {
    if (!logicalTutorId) return;
    await refreshTutorUpcoming(logicalTutorId, queryClient);
    if (tab === "history") {
      setHistoryCursor(null);
      await loadHistory(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleSessionUpdate = (updatedSession: Session) => {
    queryClient.setQueryData<Session[]>(
      ["sessions", "upcoming", "tutor", logicalTutorId],
      (prev) =>
        (prev ?? []).map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    setHistorySessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    if (managingSession?.id === updatedSession.id) setManagingSession(updatedSession);
  };

  const activeSessions = upcomingSessions
    .filter((s) => s.status !== "Completed")
    .sort((a, b) => {
      const cancelledRank = (x: Session) => (x.status === "Cancelled" ? 1 : 0);
      const rc = cancelledRank(a) - cancelledRank(b);
      if (rc !== 0) return rc;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

  const completedUpcoming = upcomingSessions
    .filter((s) => s.status === "Completed")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const displayError = tab === "upcoming" ? upcomingError : historyError;

  return (
    <RoleGuard allowedRoles={["TUTOR"]}>
      <div className="p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">Tutor Dashboard</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-primary font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} /> Back to Website
            </Link>
            <Link
              href="/tutor/availability"
              className="flex items-center gap-2 text-primary hover:bg-primary/10 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Set availability
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
            >
              <LogOut size={20} /> Logout
            </button>
          </div>
        </div>

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
            disabled={isLoading || isFetching || historyLoading}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RotateCcw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {tab === "upcoming" && isLoading ? (
          <Loader2 className="animate-spin" />
        ) : tab === "upcoming" ? (
          <div className="space-y-10">
            <SessionTable
              title="Upcoming and active"
              sessions={activeSessions}
              emptyMessage="No scheduled sessions right now."
              onManage={setManagingSession}
              showStatus
              primaryAction="complete"
            />
            <SessionTable
              title="Recently completed (upcoming list)"
              sessions={completedUpcoming}
              emptyMessage="No completed sessions in the upcoming window."
              onManage={setManagingSession}
              primaryAction="edit"
            />
          </div>
        ) : historyLoading && !historyLoaded ? (
          <Loader2 className="animate-spin" />
        ) : (
          <div>
            <SessionTable
              title="Past sessions"
              sessions={historySessions}
              emptyMessage="No past sessions found."
              onManage={setManagingSession}
              primaryAction="edit"
            />
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
          </div>
        )}

        {managingSession && profile && (
          <ManageSessionModal
            session={managingSession}
            userProfile={profile}
            onClose={() => setManagingSession(null)}
            onUpdate={handleSessionUpdate}
          />
        )}
      </div>
    </RoleGuard>
  );
}

function SessionTable({
  title,
  sessions,
  emptyMessage,
  onManage,
  showStatus,
  primaryAction,
}: {
  title: string;
  sessions: Session[];
  emptyMessage: string;
  onManage: (s: Session) => void;
  showStatus?: boolean;
  primaryAction: "complete" | "edit";
}) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-gray-700 text-sm">Student</th>
                <th className="px-4 py-3 text-gray-700 text-sm">Subject</th>
                <th className="px-4 py-3 text-gray-700 text-sm whitespace-nowrap">Time</th>
                <th className="px-4 py-3 text-gray-700 text-sm">Location</th>
                <th className="px-4 py-3 text-gray-700 text-sm min-w-[180px]">Notes</th>
                {showStatus && <th className="px-4 py-3 text-gray-700 text-sm">Status</th>}
                <th className="px-4 py-3 text-gray-700 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                  <td className="px-4 py-3 font-medium text-sm">{s.studentName}</td>
                  <td className="px-4 py-3 text-sm">{s.subject}</td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {new Date(s.startTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {s.location ? (
                      <span className="inline-flex items-start gap-1.5 text-gray-800">
                        <MapPin size={14} className="shrink-0 mt-0.5 text-primary" />
                        <span className="whitespace-pre-wrap">{s.location}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {s.notes ? (
                      <span className="inline-flex items-start gap-1.5">
                        <StickyNote size={14} className="shrink-0 mt-0.5 text-amber-600" />
                        <span className="line-clamp-3 whitespace-pre-wrap">{s.notes}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  {showStatus && (
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          s.status === "Cancelled"
                            ? "bg-red-100 text-red-700"
                            : s.status === "NoShow"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-[#1A2742]/10 text-primary"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onManage(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 ${
                        primaryAction === "complete"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {primaryAction === "complete" ? (
                        <>
                          <CheckCircle size={16} />
                          Mark Complete
                        </>
                      ) : (
                        <>
                          <MessageSquare size={16} />
                          Edit Details
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
