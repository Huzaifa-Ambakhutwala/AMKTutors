"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useLogicalUserId } from "@/hooks/useProfile";
import {
  useTutorUpcomingSessions,
  useTutorHistorySessions,
  refreshTutorUpcoming,
  refreshTutorHistory,
} from "@/hooks/useSessions";
import { Session } from "@/lib/types";
import { HISTORY_PAGE_SIZE } from "@/lib/sessions-query";
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
  const { logicalUserId: logicalTutorId, profile, profileLoading } =
    useLogicalUserId(profileId);

  const {
    data: upcomingSessions = [],
    isLoading,
    isFetching,
    error: upcomingError,
    refetch,
  } = useTutorUpcomingSessions(logicalTutorId, {
    enabled: !!user && !!logicalTutorId,
  });

  const [tab, setTab] = useState<Tab>("upcoming");

  const {
    data: historyData,
    fetchNextPage,
    hasNextPage,
    isLoading: historyLoading,
    isFetchingNextPage,
    error: historyError,
    refetch: refetchHistory,
  } = useTutorHistorySessions(logicalTutorId, {
    enabled: !!user && !!logicalTutorId && tab === "history",
  });

  const historySessions =
    historyData?.pages.flatMap((page) => page.sessions) ?? [];

  const [managingSession, setManagingSession] = useState<Session | null>(null);

  const handleRefresh = async () => {
    if (!logicalTutorId) return;
    await refreshTutorUpcoming(logicalTutorId, queryClient);
    if (tab === "history") {
      await refreshTutorHistory(logicalTutorId, queryClient);
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
    if (logicalTutorId) {
      queryClient.setQueryData(
        ["sessions", "history", "tutor", logicalTutorId],
        (old: { pages: { sessions: Session[]; nextCursor: string | null }[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              sessions: page.sessions.map((s) =>
                s.id === updatedSession.id ? updatedSession : s
              ),
            })),
          };
        }
      );
    }
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
  const historyLoaded = (historyData?.pages.length ?? 0) > 0;

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
          onRetry={() => (tab === "upcoming" ? refetch() : refetchHistory())}
        />

        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("upcoming")}
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
              onClick={() => setTab("history")}
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
            disabled={isLoading || isFetching || historyLoading || isFetchingNextPage}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <RotateCcw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {tab === "upcoming" && (profileLoading || isLoading) ? (
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
            {hasNextPage && (
              <button
                type="button"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
                className="mt-4 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading…" : `Load more (${HISTORY_PAGE_SIZE})`}
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
