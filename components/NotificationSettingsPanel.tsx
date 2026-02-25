"use client";

import { useEffect, useState } from "react";
import { Loader2, Bell, Mail, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

interface Props {
  title?: string;
}

export default function NotificationSettingsPanel({ title = "Notification preferences" }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: false,
    emailEnabled: true,
    smsEnabled: false,
  });
  const [userHasEmail, setUserHasEmail] = useState<boolean | null>(null);

  const {
    permission,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, meRes] = await Promise.all([
          fetch("/api/notifications/settings"),
          fetch("/api/auth/me"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings({
            pushEnabled: data.settings.pushEnabled,
            emailEnabled: data.settings.emailEnabled,
            smsEnabled: data.settings.smsEnabled,
          });
        }

        if (meRes.ok) {
          const data = await meRes.json();
          setUserHasEmail(!!data.user?.email);
        } else {
          setUserHasEmail(null);
        }
      } catch (e) {
        console.error("Failed to load notification settings", e);
        toast.error("Unable to load notification settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const persistSettings = async (patch: Partial<NotificationSettings>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushEnabled: patch.pushEnabled ?? settings.pushEnabled,
          emailEnabled: patch.emailEnabled ?? settings.emailEnabled,
        }),
      });
      if (!res.ok) {
        throw new Error("Save failed");
      }
      const data = await res.json();
      setSettings({
        pushEnabled: data.settings.pushEnabled,
        emailEnabled: data.settings.emailEnabled,
        smsEnabled: data.settings.smsEnabled,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async () => {
    if (permission === "unsupported") {
      toast.error("Push notifications are not supported in this browser.");
      return;
    }

    const targetEnabled = !settings.pushEnabled;
    setSettings((prev) => ({ ...prev, pushEnabled: targetEnabled }));

    if (targetEnabled) {
      const ok = await subscribe();
      if (!ok) {
        setSettings((prev) => ({ ...prev, pushEnabled: false }));
        toast.error("Permission denied or subscription failed.");
        return;
      }
    } else {
      await unsubscribe();
    }

    await persistSettings({ pushEnabled: targetEnabled });
  };

  const handleToggleEmail = async () => {
    const targetEnabled = !settings.emailEnabled;
    setSettings((prev) => ({ ...prev, emailEnabled: targetEnabled }));
    await persistSettings({ emailEnabled: targetEnabled });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const pushStatusLabel =
    permission === "granted"
      ? isSubscribed
        ? "Enabled"
        : "Ready to subscribe"
      : permission === "denied"
      ? "Blocked in browser"
      : "Permission not requested";

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Bell className="text-primary" size={20} />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-4 md:p-6 space-y-4">
        {/* Push */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-primary" />
              <p className="font-medium text-gray-900">Push notifications</p>
            </div>
            <p className="text-sm text-gray-500">
              Receive real-time alerts in this browser.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Status: {pushStatusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={
              pushLoading || saving || permission === "denied" || permission === "unsupported"
            }
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
              settings.pushEnabled && permission === "granted"
                ? "bg-primary border-primary"
                : "bg-gray-200 border-gray-300"
            } ${pushLoading || saving ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.pushEnabled && permission === "granted"
                  ? "translate-x-5"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-primary" />
              <p className="font-medium text-gray-900">Email notifications</p>
            </div>
            <p className="text-sm text-gray-500">
              Summary and important updates sent to your email.
            </p>
            {settings.emailEnabled && userHasEmail === false && (
              <p className="text-xs text-red-600 mt-1">
                Email notifications are enabled, but your profile has no email address.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleEmail}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
              settings.emailEnabled
                ? "bg-primary border-primary"
                : "bg-gray-200 border-gray-300"
            } ${saving ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.emailEnabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* SMS (stub) */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-100 opacity-60">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-gray-400" />
              <p className="font-medium text-gray-700">SMS notifications</p>
            </div>
            <p className="text-sm text-gray-500">Coming soon.</p>
          </div>
          <button
            type="button"
            disabled
            className="relative inline-flex h-7 w-12 items-center rounded-full border border-gray-300 bg-gray-200 cursor-not-allowed"
          >
            <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}

