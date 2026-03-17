"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare, Phone, Mail, ChevronRight, MapPin, Users,
} from "lucide-react";
import { useTranslation } from "./LanguageProvider";
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

interface ActivityFeedProps {
  parentType: string;
  parentId: string;
  activities: ActivityItem[];
  linkedActivities?: ActivityItem[];
}

export default function ActivityFeed({
  parentType,
  parentId,
  activities,
  linkedActivities = [],
}: ActivityFeedProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id || "";
  const [activityReactions, setActivityReactions] = useState<Record<string, { emoji: string; userId: string; userName: string }[]>>({});

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
