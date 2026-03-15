"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  MessageSquare, Phone, Mail, Calendar, ChevronRight, MapPin, Users, AtSign,
} from "lucide-react";
import { useTranslation } from "./LanguageProvider";
import { logger } from "@/lib/logger";
import EmojiReactions from "@/components/EmojiReactions";

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  note: MessageSquare,
  email: Mail,
  site_visit: MapPin,
  meeting: Users,
  status_change: ChevronRight,
};

const ACTIVITY_TYPE_KEYS: Record<string, string> = {
  note: "activity.note",
  call: "activity.call",
  email: "activity.email",
  site_visit: "activity.siteVisit",
  meeting: "activity.meeting",
  status_change: "activity.statusChange",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  date?: string;
  title?: string | null;
  parentType?: string;
  parentId?: string;
  _linkedFrom?: string;
}

interface WorkerOption {
  id: string;
  name: string;
}

interface ActivityFeedProps {
  parentType: string;
  parentId: string;
  activities: ActivityItem[];
  linkedActivities?: ActivityItem[];
  showCreateForm?: boolean;
}

export default function ActivityFeed({
  parentType,
  parentId,
  activities,
  linkedActivities = [],
  showCreateForm = true,
}: ActivityFeedProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id || "";
  const [activityType, setActivityType] = useState("note");
  const [activityText, setActivityText] = useState("");
  const [saving, setSaving] = useState(false);
  const [activityReactions, setActivityReactions] = useState<Record<string, { emoji: string; userId: string; userName: string }[]>>({});

  // @mention state
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionedWorkers, setMentionedWorkers] = useState<WorkerOption[]>([]);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Load workers once for @mention dropdown
  useEffect(() => {
    fetch("/api/workers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkers(data.map((w: any) => ({ id: w.id, name: w.name })));
        }
      })
      .catch(() => {});
  }, []);

  // Close mention dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredWorkers = workers.filter((w) =>
    w.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const insertMention = (worker: WorkerOption) => {
    // Replace the @query with @Name
    const before = activityText.slice(0, mentionStartPos);
    const after = activityText.slice(inputRef.current?.selectionStart || activityText.length);
    // Find end of current @query
    const restFromAt = activityText.slice(mentionStartPos);
    const spaceIdx = restFromAt.indexOf(" ");
    const afterMention = spaceIdx >= 0 ? restFromAt.slice(spaceIdx) : "";
    const newText = `${before}@${worker.name} ${afterMention.trimStart()}`;
    setActivityText(newText);
    setShowMentions(false);
    setMentionFilter("");

    // Track mentioned worker
    if (!mentionedWorkers.find((m) => m.id === worker.id)) {
      setMentionedWorkers((prev) => [...prev, worker]);
    }

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setActivityText(val);

    // Detect @ trigger
    const cursorPos = e.target.selectionStart || val.length;
    const textUpToCursor = val.slice(0, cursorPos);
    const lastAtIndex = textUpToCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      // Check if @ is at start or after a space
      const charBefore = lastAtIndex > 0 ? textUpToCursor[lastAtIndex - 1] : " ";
      if (charBefore === " " || lastAtIndex === 0) {
        const query = textUpToCursor.slice(lastAtIndex + 1);
        // Only show dropdown if no space in the query (still typing a name)
        if (!query.includes(" ") || query.length <= 1) {
          setMentionFilter(query);
          setMentionStartPos(lastAtIndex);
          setShowMentions(true);
          setMentionIndex(0);
          return;
        }
      }
    }
    setShowMentions(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && filteredWorkers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, filteredWorkers.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredWorkers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }
    if (e.key === "Enter" && !showMentions) {
      handleAddActivity();
    }
  };

  const handleAddActivity = async () => {
    if (!activityText.trim()) return;
    setSaving(true);
    try {
      // Parse which @mentions are still in the final text
      const finalMentions = mentionedWorkers.filter((w) =>
        activityText.includes(`@${w.name}`)
      );

      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentType,
          parentId,
          type: activityType,
          description: activityText,
          mentions: finalMentions.map((w) => ({ id: w.id, name: w.name })),
        }),
      });
      setActivityText("");
      setMentionedWorkers([]);
      router.refresh();
    } catch (err) {
      logger.error("Failed to add activity", { error: String(err) });
    } finally {
      setSaving(false);
    }
  };

  // Merge own + linked activities, sorted by date descending
  const allActivities = [
    ...activities.map((a) => ({ ...a, _linkedFrom: undefined })),
    ...linkedActivities,
  ].sort(
    (a, b) =>
      new Date(b.createdAt || b.date || "").getTime() -
      new Date(a.createdAt || a.date || "").getTime()
  );

  // Fetch reactions for all activities
  const fetchActivityReactions = useCallback(async (items: ActivityItem[]) => {
    if (items.length === 0) return;
    try {
      const ids = items.map((a) => a.id).join(",");
      const res = await fetch(`/api/reactions?targetType=activity&targetIds=${ids}`);
      if (res.ok) {
        const grouped: Record<string, { emoji: string; userId: string; userName: string }[]> = await res.json();
        setActivityReactions(grouped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (allActivities.length > 0) fetchActivityReactions(allActivities);
  }, [activities, linkedActivities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render description with @mentions highlighted
  const renderDescription = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w[\w\s]*?\w(?=\s|$))/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-indigo-600 font-medium bg-indigo-50 rounded px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        {t("activity.title")}
      </h3>

      {/* Creation Form */}
      {showCreateForm && (
        <div className="flex gap-2 mb-3">
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
          >
            <option value="note">{t("activity.note")}</option>
            <option value="call">{t("activity.call")}</option>
            <option value="email">{t("activity.email")}</option>
            <option value="site_visit">{t("activity.siteVisit")}</option>
            <option value="meeting">{t("activity.meeting")}</option>
          </select>
          <div className="flex-1 relative" ref={mentionRef}>
            <input
              ref={inputRef}
              value={activityText}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={`${t("activity.addActivity")} (type @ to mention)`}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
            {/* @mention dropdown */}
            {showMentions && filteredWorkers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredWorkers.slice(0, 8).map((w, i) => (
                  <button
                    key={w.id}
                    onClick={() => insertMention(w)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-indigo-50 transition ${
                      i === mentionIndex ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                    }`}
                  >
                    <AtSign size={12} className="text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Mentioned workers pills */}
            {mentionedWorkers.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {mentionedWorkers.map((w) => (
                  <span
                    key={w.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-indigo-50 text-indigo-600 rounded-full"
                  >
                    <AtSign size={8} />
                    {w.name}
                    <button
                      onClick={() => setMentionedWorkers((prev) => prev.filter((m) => m.id !== w.id))}
                      className="ml-0.5 text-indigo-400 hover:text-indigo-700"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleAddActivity}
            disabled={saving || !activityText.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {saving ? "..." : t("activity.add")}
          </button>
        </div>
      )}

      {/* Activity List */}
      <div className="space-y-2">
        {allActivities.map((a) => {
          const Icon = ACTIVITY_ICONS[a.type] || MessageSquare;
          const typeKey = ACTIVITY_TYPE_KEYS[a.type] || "activity.note";
          const dateStr = a.createdAt || a.date || "";
          return (
            <div
              key={a.id}
              className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0"
            >
              <div className="p-1 bg-slate-100 rounded mt-0.5">
                <Icon size={11} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-700">
                  {renderDescription(a.description)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {dateStr && formatDate(dateStr)} — {t(typeKey)}
                  {a._linkedFrom && (
                    <span className="ml-1 text-indigo-500">
                      ({t("activity.fromLinked")} {a._linkedFrom})
                    </span>
                  )}
                </div>
                {currentUserId && (
                  <EmojiReactions
                    targetType="activity"
                    targetId={a.id}
                    currentUserId={currentUserId}
                    initialReactions={activityReactions[a.id] || []}
                    compact
                  />
                )}
              </div>
            </div>
          );
        })}
        {allActivities.length === 0 && (
          <p className="text-sm text-slate-400">{t("activity.noActivity")}</p>
        )}
      </div>
    </div>
  );
}
