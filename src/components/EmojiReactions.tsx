"use client";

import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "✅", "💯"];

interface ReactionData {
  emoji: string;
  users: { userId: string; userName: string }[];
}

interface EmojiReactionsProps {
  targetType: "message" | "activity";
  targetId: string;
  currentUserId: string;
  // Pre-loaded reactions (optional — avoids per-item fetch)
  initialReactions?: { emoji: string; userId: string; userName: string }[];
  compact?: boolean; // smaller layout for activity feed
}

export default function EmojiReactions({
  targetType,
  targetId,
  currentUserId,
  initialReactions,
  compact = false,
}: EmojiReactionsProps) {
  const [reactions, setReactions] = useState<{ emoji: string; userId: string; userName: string }[]>(
    initialReactions || []
  );
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Update when initialReactions change
  useEffect(() => {
    if (initialReactions) setReactions(initialReactions);
  }, [initialReactions]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const toggleReaction = async (emoji: string) => {
    setShowPicker(false);

    // Optimistic update
    const existing = reactions.find((r) => r.emoji === emoji && r.userId === currentUserId);
    if (existing) {
      setReactions((prev) => prev.filter((r) => !(r.emoji === emoji && r.userId === currentUserId)));
    } else {
      setReactions((prev) => [...prev, { emoji, userId: currentUserId, userName: "You" }]);
    }

    try {
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, emoji }),
      });
    } catch {
      // Revert on error — refetch
      try {
        const res = await fetch(`/api/reactions?targetType=${targetType}&targetId=${targetId}`);
        if (res.ok) {
          const data = await res.json();
          setReactions(data.map((r: any) => ({ emoji: r.emoji, userId: r.userId, userName: r.userName })));
        }
      } catch { }
    }
  };

  // Group reactions by emoji
  const grouped: ReactionData[] = [];
  const emojiMap = new Map<string, { userId: string; userName: string }[]>();
  for (const r of reactions) {
    if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
    emojiMap.get(r.emoji)!.push({ userId: r.userId, userName: r.userName });
  }
  emojiMap.forEach((users, emoji) => {
    grouped.push({ emoji, users });
  });

  const btnSize = compact ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";
  const pickerSize = compact ? "p-1.5 gap-1" : "p-2 gap-1.5";

  const hasReactions = grouped.length > 0;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${hasReactions ? "mt-1" : "mt-0.5"} group/reactions`}>
      {/* Existing reactions */}
      {grouped.map(({ emoji, users }) => {
        const isMine = users.some((u) => u.userId === currentUserId);
        const names = users.map((u) => u.userId === currentUserId ? "You" : u.userName).join(", ");
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            title={names}
            className={`inline-flex items-center gap-0.5 rounded-full border transition-colors ${btnSize} ${
              isMine
                ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] text-slate-500">{users.length}</span>
          </button>
        );
      })}

      {/* Add reaction button */}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition ${compact ? "w-5 h-5" : "w-6 h-6"}`}
          title="Add reaction"
        >
          <SmilePlus size={compact ? 11 : 13} />
        </button>

        {showPicker && (
          <div className={`absolute bottom-full left-0 mb-1 bg-white rounded-xl border border-slate-200 shadow-lg z-30 flex flex-wrap ${pickerSize}`}
            style={{ width: compact ? "160px" : "200px" }}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className={`rounded-lg hover:bg-slate-100 transition ${compact ? "w-7 h-7 text-sm" : "w-8 h-8 text-base"} flex items-center justify-center`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
