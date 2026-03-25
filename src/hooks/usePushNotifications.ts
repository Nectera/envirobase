"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = "unsupported" | "denied" | "prompt" | "subscribed" | "unsubscribed" | "loading";

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Check current state on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setState("unsupported");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setState("denied");
      return;
    }

    // Check for existing subscription
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscription(sub);
          setState("subscribed");
        } else {
          setState(permission === "granted" ? "unsubscribed" : "prompt");
        }
      });
    });
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!VAPID_PUBLIC_KEY) return false;
    setState("loading");

    try {
      // Register the push service worker
      const swReg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return false;
      }

      const sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Send subscription to server
      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");
      const p256dhStr = p256dhKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey)))) : "";
      const authStr = authKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey)))) : "";

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: p256dhStr,
            auth: authStr,
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setSubscription(sub);
        setState("subscribed");
        return true;
      } else {
        setState("unsubscribed");
        return false;
      }
    } catch (error) {
      console.error("Push subscribe error:", error);
      setState("unsubscribed");
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState("loading");
    try {
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Remove from server
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setSubscription(null);
      setState("unsubscribed");
      return true;
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      setState("subscribed"); // Revert state
      return false;
    }
  }, [subscription]);

  return {
    state,
    isSubscribed: state === "subscribed",
    isSupported: state !== "unsupported",
    isDenied: state === "denied",
    isLoading: state === "loading",
    subscribe,
    unsubscribe,
  };
}
