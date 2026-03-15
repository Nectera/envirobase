"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";

const SKILL_LABELS: Record<number, string> = {
  1: "Novice",
  2: "Basic",
  3: "Competent",
  4: "Skilled",
  5: "Expert",
};

const SKILL_COLORS: Record<number, string> = {
  1: "text-slate-400",
  2: "text-blue-500",
  3: "text-amber-500",
  4: "text-orange-500",
  5: "text-red-500",
};

export default function SkillRating({
  workerId,
  currentRating,
}: {
  workerId: string;
  currentRating: number | null;
}) {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const rating = currentRating || 0;
  const displayRating = hoveredStar ?? rating;

  async function setRating(value: number) {
    setSaving(true);
    await fetch(`/api/workers/${workerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skillRating: value }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Skill Rating</h3>
          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        {saving && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-0.5" onMouseLeave={() => setHoveredStar(null)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onClick={() => setRating(star)}
              disabled={saving}
              className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Star
                size={24}
                className={`transition-colors ${
                  star <= displayRating
                    ? `${SKILL_COLORS[displayRating] || "text-amber-500"} fill-current`
                    : "text-slate-200"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {displayRating > 0 && (
            <>
              <span className={`text-sm font-semibold ${SKILL_COLORS[displayRating]}`}>
                {displayRating}/5
              </span>
              <span className="text-xs text-slate-500">
                {SKILL_LABELS[displayRating]}
              </span>
            </>
          )}
          {displayRating === 0 && (
            <span className="text-xs text-slate-400">Not rated — click a star to set</span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`text-center text-[9px] py-1 rounded ${
              rating === level
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-slate-400"
            }`}
          >
            {SKILL_LABELS[level]}
          </div>
        ))}
      </div>
    </div>
  );
}
