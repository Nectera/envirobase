"use client";

import { useEffect, useState } from "react";

export default function ChatUnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/chat/unread");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setCount(data.total || 0);
      } catch {
        // silently ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}
