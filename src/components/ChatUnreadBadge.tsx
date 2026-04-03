"use client";

import { useEffect, useState, useCallback } from "react";

export default function ChatUnreadBadge() {
  const [count, setCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const [chatRes, notifRes] = await Promise.all([
        fetch("/api/chat/unread"),
        fetch("/api/notifications?unread=true"),
      ]);

      let chatCount = 0;
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        chatCount = chatData.total || 0;
      }

      let notifCount = 0;
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        notifCount = Array.isArray(notifData)
          ? notifData.filter((n: any) => !n.read).length
          : notifData.unreadCount || 0;
      }

      const total = chatCount + notifCount;
      setCount(total);

      // Update PWA app badge
      if ("setAppBadge" in navigator) {
        if (total > 0) {
          (navigator as any).setAppBadge(total);
        } else {
          (navigator as any).clearAppBadge();
        }
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s

    // Refresh immediately when app comes to foreground
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchUnread();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for notifications-read event from AlertsHeader
    const handleNotificationsRead = () => fetchUnread();
    window.addEventListener("notifications-read", handleNotificationsRead);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("notifications-read", handleNotificationsRead);
    };
  }, [fetchUnread]);

  if (count <= 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}
