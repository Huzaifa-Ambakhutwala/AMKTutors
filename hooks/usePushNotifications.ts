import { useCallback, useEffect, useState } from "react";

type PermissionState = NotificationPermission | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch(() => {
        setIsSubscribed(false);
      });
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return false;
    }

    setLoading(true);
    try {
      let perm = Notification.permission;
      if (perm === "default") {
        perm = await Notification.requestPermission();
      }
      setPermission(perm);
      if (perm !== "granted") {
        return false;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));

      const vapidKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidKey) {
        console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to any to satisfy slightly narrow TS DOM types; runtime expects a Uint8Array.
        applicationServerKey: vapidKey
          ? (urlBase64ToUint8Array(vapidKey) as any)
          : undefined,
      });

      await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.toJSON().keys?.p256dh,
              auth: sub.toJSON().keys?.auth,
            },
            userAgent: navigator.userAgent,
          },
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error("Push subscribe failed", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (typeof window === "undefined") return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/notifications/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
      return true;
    } catch (e) {
      console.error("Push unsubscribe failed", e);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}

