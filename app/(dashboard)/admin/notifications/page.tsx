"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import {
  Bell,
  Loader2,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import type {
  NotificationRule,
  NotificationEventType,
  NotificationAudienceType,
  NotificationRuleChannels,
  NotificationRuleTemplate,
  NotificationLog,
  UserRole,
} from "@/lib/types";

const EVENT_OPTIONS: { value: NotificationEventType; label: string }[] = [
  { value: "SESSION_SCHEDULED", label: "Session scheduled" },
  { value: "SESSION_CANCELLED", label: "Session cancelled" },
  { value: "SESSION_REMINDER_24H", label: "Session reminder (24h)" },
  { value: "SESSION_REMINDER_1H", label: "Session reminder (1h)" },
  { value: "SESSION_AFTER", label: "After session" },
  { value: "INVOICE_CREATED", label: "Invoice created" },
  { value: "TUTOR_ASSIGNED", label: "Tutor assigned" },
];

const AUDIENCE_OPTIONS: { value: NotificationAudienceType; label: string }[] = [
  { value: "PARENT_OF_STUDENT", label: "Parent of student" },
  { value: "TUTOR_ASSIGNED", label: "Assigned tutor" },
  { value: "ADMIN_ALL", label: "All admins" },
  { value: "CUSTOM_BY_ROLE", label: "Custom by role" },
];

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Admins" },
  { value: "TUTOR", label: "Tutors" },
  { value: "PARENT", label: "Parents" },
];

const TEMPLATE_VARIABLES = [
  "studentName",
  "tutorName",
  "sessionDate",
  "sessionTime",
  "portalLink",
] as const;

function emptyTemplate(): NotificationRuleTemplate {
  return {
    title: "",
    body: "",
    emailSubject: "",
    emailHtml: "",
  };
}

export default function AdminNotificationsPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");
  const [editing, setEditing] = useState<NotificationRule | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRules(true);
        const res = await fetch("/api/admin/notification-rules");
        if (!res.ok) throw new Error("Failed to load rules");
        const data = await res.json();
        setRules(data.rules || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load notification rules");
      } finally {
        setLoadingRules(false);
      }
    };
    load();
  }, []);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/admin/notification-logs?limit=50");
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load notification logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    }
  }, [activeTab]);

  const startCreateRule = () => {
    const nowIso = new Date().toISOString();
    setEditing({
      id: "",
      name: "",
      enabled: true,
      eventType: "SESSION_SCHEDULED",
      audienceType: "PARENT_OF_STUDENT",
      roles: [],
      channels: { push: true, email: true, sms: false },
      template: emptyTemplate(),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  };

  const saveRule = async () => {
    if (!editing) return;
    setSavingRule(true);
    try {
      const payload = {
        name: editing.name,
        enabled: editing.enabled,
        eventType: editing.eventType,
        audienceType: editing.audienceType,
        roles: editing.roles || [],
        channels: editing.channels,
        template: editing.template,
      };
      const res = await fetch(
        editing.id
          ? `/api/admin/notification-rules/${editing.id}`
          : "/api/admin/notification-rules",
        {
          method: editing.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      const saved: NotificationRule = data.rule;
      setRules((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx === -1) return [...prev, saved];
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      });
      setEditing(null);
      toast.success("Notification rule saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save rule");
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this notification rule?")) return;
    try {
      const res = await fetch(`/api/admin/notification-rules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete rule");
    }
  };

  const openEdit = (rule: NotificationRule) => {
    setEditing(rule);
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={24} className="text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading">
              Notifications
            </h1>
            <p className="text-sm text-gray-500">
              Configure notification rules and review recent sends.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[40px] ${
              activeTab === "rules"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[40px] ${
              activeTab === "logs"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Logs
          </button>
        </div>

        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ListChecks size={18} /> Rules
              </h2>
              <button
                type="button"
                onClick={startCreateRule}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                <Plus size={16} /> New rule
              </button>
            </div>

            {loadingRules ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : rules.length === 0 ? (
              <p className="text-sm text-gray-500">
                No rules yet. Create a new rule to start sending notifications.
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>{r.name}</span>
                        {!r.enabled && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Disabled
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {r.eventType} → {r.audienceType} • Channels:{" "}
                        {[
                          r.channels.push && "push",
                          r.channels.email && "email",
                          r.channels.sms && "sms",
                        ]
                          .filter(Boolean)
                          .join(", ") || "none"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRule(r.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-100 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Simple editor */}
            {editing && (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {editing.id ? "Edit rule" : "New rule"}
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Event
                      </label>
                      <select
                        value={editing.eventType}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  eventType: e.target
                                    .value as NotificationEventType,
                                }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {EVENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Audience
                      </label>
                      <select
                        value={editing.audienceType}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  audienceType: e.target
                                    .value as NotificationAudienceType,
                                }
                              : prev
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {AUDIENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-6 md:mt-7">
                      <input
                        id="rule-enabled"
                        type="checkbox"
                        checked={editing.enabled}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev ? { ...prev, enabled: e.target.checked } : prev
                          )
                        }
                        className="rounded border-gray-300"
                      />
                      <label
                        htmlFor="rule-enabled"
                        className="text-sm text-gray-700"
                      >
                        Enabled
                      </label>
                    </div>
                  </div>

                  {editing.audienceType === "CUSTOM_BY_ROLE" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Roles
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ROLE_OPTIONS.map((r) => {
                          const selected = editing.roles?.includes(r.value);
                          return (
                            <button
                              key={r.value}
                              type="button"
                              onClick={() =>
                                setEditing((prev) => {
                                  if (!prev) return prev;
                                  const roles = new Set(prev.roles || []);
                                  if (roles.has(r.value))
                                    roles.delete(r.value);
                                  else roles.add(r.value);
                                  return {
                                    ...prev,
                                    roles: Array.from(roles),
                                  };
                                })
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                                selected
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-gray-700 border-gray-300"
                              }`}
                            >
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Channels */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channels
                    </label>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing.channels.push}
                          onChange={(e) =>
                            setEditing((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    channels: {
                                      ...prev.channels,
                                      push: e.target.checked,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        Push
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing.channels.email}
                          onChange={(e) =>
                            setEditing((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    channels: {
                                      ...prev.channels,
                                      email: e.target.checked,
                                    },
                                  }
                                : prev
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                        <input
                          type="checkbox"
                          checked={editing.channels.sms}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        SMS (coming soon)
                      </label>
                    </div>
                  </div>

                  {/* Templates (simplified) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-800">
                        Push
                      </h4>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500 mb-1">
                        <span className="uppercase tracking-wide mr-1">
                          Variables:
                        </span>
                        {TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              setEditing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      template: {
                                        ...prev.template,
                                        body:
                                          (prev.template.body || "") +
                                          ` {{${v}}}`,
                                      },
                                    }
                                  : prev
                              )
                            }
                            className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={editing.template.title}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    title: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="Title (e.g. New session for {{studentName}})"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <textarea
                        value={editing.template.body}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    body: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="Body (supports {{studentName}}, {{tutorName}}, {{sessionDate}}, {{sessionTime}}, {{portalLink}})"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-800">
                        Email
                      </h4>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500 mb-1">
                        <span className="uppercase tracking-wide mr-1">
                          Variables:
                        </span>
                        {TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() =>
                              setEditing((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      template: {
                                        ...prev.template,
                                        emailHtml:
                                          (prev.template.emailHtml || "") +
                                          ` {{${v}}}`,
                                      },
                                    }
                                  : prev
                              )
                            }
                            className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={editing.template.emailSubject}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    emailSubject: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="Email subject"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <textarea
                        value={editing.template.emailHtml}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  template: {
                                    ...prev.template,
                                    emailHtml: e.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        placeholder="Email HTML (basic) with variables"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-24"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveRule}
                      disabled={savingRule}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {savingRule ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      Save rule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-900">Recent logs</h2>
              <button
                type="button"
                onClick={loadLogs}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {loadingLogs ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs yet.</p>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2">Time</th>
                      <th className="px-4 py-2">Event</th>
                      <th className="px-4 py-2">Rule</th>
                      <th className="px-4 py-2">Recipient</th>
                      <th className="px-4 py-2">Channels</th>
                      <th className="px-4 py-2">Error</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-xs">{log.eventType}</td>
                        <td className="px-4 py-2 text-xs">{log.ruleId}</td>
                        <td className="px-4 py-2 text-xs">
                          {log.recipientUserId}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          {[
                            log.channelsAttempted.push && "push",
                            log.channelsAttempted.email && "email",
                            log.channelsAttempted.sms && "sms",
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td
                          className="px-4 py-2 text-xs text-gray-500 max-w-[320px] truncate"
                          title={log.error || ""}
                        >
                          {log.error || "—"}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full font-medium ${
                              log.status === "SENT"
                                ? "bg-green-100 text-green-700"
                                : log.status === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

