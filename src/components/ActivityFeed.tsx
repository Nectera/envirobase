"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare, Phone, Mail, ChevronRight, ChevronDown, MapPin, Users, Smartphone, Mic,
  PhoneIncoming, PhoneOutgoing, Clock,
} from "lucide-react";
import { useTranslation } from "./LanguageProvider";
import EmojiReactions from "@/components/EmojiReactions";

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  note: MessageSquare,
  email: Mail,
  sms: Smartphone,
  site_visit: MapPin,
  meeting: Users,
  status_change: ChevronRight,
};

const ACTIVITY_TYPE_KEYS: Record<string, string> = {
  note: "activity.note",
  call: "activity.call",
  sms: "activity.sms",
  email: "activity.email",
  site_visit: "activity.siteVisit",
  meeting: "activity.meeting",
  status_change: "activity.statusChange",
};

function formatDate(d: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d: string) {
  try {
    return new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

interface CallMetadata {
  direction?: string;
  duration?: number;
  recordingUrl?: string;
  fromNumber?: string;
  toNumber?: string;
  sessionId?: string;
  startTime?: string;
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
  metadata?: CallMetadata | null;
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
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [backfillDone, setBackfillDone] = useState(false);

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

  // Trigger recording backfill if there are recent calls missing recordings/duration
  useEffect(() => {
    if (backfillDone) return;
    const hasCalls = allActivities.some((a) => a.type === "call");
    if (!hasCalls) return;
    const needsBackfill = allActivities.some((a) => {
      if (a.type !== "call") return false;
      const meta = a.metadata as CallMetadata | null;
      return meta?.sessionId && (!meta.recordingUrl || meta.duration === 0);
    });
    if (needsBackfill) {
      fetch("/api/ringcentral/backfill-recordings", { method: "POST" })
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          if (data?.updated > 0) {
            // Refresh the page to show updated data
            window.location.reload();
          }
        })
        .catch(() => {})
        .finally(() => setBackfillDone(true));
    } else {
      setBackfillDone(true);
    }
  }, [allActivities, backfillDone]);

  // Render description with @mentions and recording links highlighted
  const renderDescription = (text: string, type?: string) => {
    if (!text) return null;

    // Check for call recording link (legacy format in content)
    const recordingMatch = text.match(/🎙️ Recording: (https?:\/\/\S+)/);

    // Strip recording line from main text (we'll render it separately via metadata or this fallback)
    const mainText = recordingMatch ? text.replace(/\n🎙️ Recording: https?:\/\/\S+/, "") : text;

    const parts = mainText.split(/(@\w[\w\s]*?\w(?=\s|$))/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith("@")) {
            return (
              <span key={i} className="text-indigo-600 font-medium bg-indigo-50 rounded px-0.5">
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  // Render call-specific details from metadata
  const renderCallDetails = (a: ActivityItem) => {
    const meta = a.metadata as CallMetadata | null;
    // Also check content for legacy recording URL
    const legacyRecording = a.description?.match(/🎙️ Recording: (https?:\/\/\S+)/)?.[1];
    const recordingUrl = meta?.recordingUrl || legacyRecording;
    const duration = meta?.duration || 0;
    const direction = meta?.direction;
    const startTime = meta?.startTime || a.createdAt;

    const hasDetails = duration > 0 || recordingUrl || direction;
    if (!hasDetails) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        {direction && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${
            direction === "inbound"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {direction === "inbound" ? <PhoneIncoming size={9} /> : <PhoneOutgoing size={9} />}
            {direction === "inbound" ? "Inbound" : "Outbound"}
          </span>
        )}
        {duration > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full">
            <Clock size={9} />
            {formatDuration(duration)}
          </span>
        )}
        {startTime && (
          <span className="text-[10px] text-slate-400">
            {formatTime(startTime)}
          </span>
        )}
        {recordingUrl && (
          recordingUrl.startsWith("/api/") ? (
            <div className="w-full mt-1">
              <audio controls preload="none" className="h-8 w-full max-w-xs" style={{ minWidth: 200 }}>
                <source src={recordingUrl} type="audio/mpeg" />
              </audio>
            </div>
          ) : (
            <a
              href={recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition"
            >
              <Mic size={9} />
              Play Recording
            </a>
          )
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        {t("activity.title")}
      </h3>

      {/* Activity List */}
      <div className="space-y-2">
        {allActivities.map((a) => {
          const isCall = a.type === "call";
          const meta = a.metadata as CallMetadata | null;
          const direction = meta?.direction;
          const Icon = isCall
            ? direction === "inbound" ? PhoneIncoming : direction === "outbound" ? PhoneOutgoing : Phone
            : ACTIVITY_ICONS[a.type] || MessageSquare;
          const typeKey = ACTIVITY_TYPE_KEYS[a.type] || "activity.note";
          const dateStr = a.createdAt || a.date || "";
          const isEmail = a.type === "email";
          const isExpanded = expandedEmails.has(a.id);

          // For emails, extract first line as preview and rest as full body
          const emailPreview = isEmail ? a.description.split("\n")[0] : "";
          const emailHasBody = isEmail && a.description.includes("\n\n");

          return (
            <div
              key={a.id}
              className={`flex items-start gap-2 py-2 border-b border-slate-50 last:border-0 ${
                isEmail && emailHasBody ? "cursor-pointer" : ""
              }`}
              onClick={
                isEmail && emailHasBody
                  ? () =>
                      setExpandedEmails((prev) => {
                        const next = new Set(prev);
                        if (next.has(a.id)) next.delete(a.id);
                        else next.add(a.id);
                        return next;
                      })
                  : undefined
              }
            >
              <div className={`p-1 rounded mt-0.5 ${
                isCall
                  ? direction === "inbound" ? "bg-green-50" : "bg-blue-50"
                  : isEmail ? "bg-blue-50" : "bg-slate-100"
              }`}>
                <Icon size={11} className={
                  isCall
                    ? direction === "inbound" ? "text-green-500" : "text-blue-500"
                    : isEmail ? "text-blue-500" : "text-slate-500"
                } />
              </div>
              <div className="flex-1 min-w-0">
                {isEmail && emailHasBody ? (
                  <>
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      <span>{emailPreview}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 whitespace-pre-wrap">
                        {a.description}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-slate-700">
                    {renderDescription(a.description, a.type)}
                  </div>
                )}
                {/* Call-specific details row */}
                {isCall && renderCallDetails(a)}
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {dateStr && formatDate(dateStr)} — {t(typeKey)}
                  {isEmail && emailHasBody && !isExpanded && (
                    <span className="ml-1 text-blue-500 font-medium">Click to view email</span>
                  )}
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
