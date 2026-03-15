"use client";

import { useState, useEffect } from "react";
import { Loader2, Star, CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";

interface SurveyData {
  id: string;
  clientName: string | null;
  projectName: string;
  rating: number | null;
  surveyCompleted: boolean;
  googleReviewUrl: string;
  googleReviewClicked: boolean;
}

export default function FeedbackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Survey state
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [contactPermission, setContactPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Post-submit state
  const [submitted, setSubmitted] = useState(false);
  const [submittedRating, setSubmittedRating] = useState<number>(0);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [reviewClicked, setReviewClicked] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/public/feedback/${params.token}`);
      if (!res.ok) {
        setError("This feedback link is invalid or has expired.");
        return;
      }
      const d: SurveyData = await res.json();
      setData(d);
      if (d.surveyCompleted && d.rating) {
        setSubmitted(true);
        setSubmittedRating(d.rating);
        setGoogleReviewUrl(d.googleReviewUrl || "");
        setReviewClicked(d.googleReviewClicked);
      }
    } catch {
      setError("Failed to load. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/feedback/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim() || undefined,
          contactPermission,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to submit");
        return;
      }
      const result = await res.json();
      setSubmitted(true);
      setSubmittedRating(selectedRating);
      if (result.googleReviewUrl) {
        setGoogleReviewUrl(result.googleReviewUrl);
      }
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleReviewClick = async () => {
    setReviewClicked(true);
    // Track the click
    try {
      await fetch(`/api/public/feedback/${params.token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleReviewClicked: true }),
      });
    } catch {
      // Non-critical
    }
    // Open Google review in new tab
    if (googleReviewUrl) {
      window.open(googleReviewUrl, "_blank");
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-sm">
          <Star size={40} className="mx-auto mb-4 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Feedback Not Found</h1>
          <p className="text-sm text-slate-500">{error || "This link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  // Already submitted — show thank you + Google review prompt (if high rating)
  if (submitted) {
    const isHighRating = submittedRating >= 4;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-[#1B3A2D] text-white">
          <div className="max-w-lg mx-auto px-4 py-6 text-center">
            <p className="text-[#7BC143] text-xs font-medium tracking-wide uppercase mb-1">
              Xtract Environmental
            </p>
            <h1 className="text-lg font-bold">Thank You!</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-8">
          {isHighRating && googleReviewUrl ? (
            // High rating — prompt for Google review
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                We're glad you had a great experience!
              </h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Your feedback means the world to us. Would you mind sharing your experience
                on Google? It helps other homeowners find quality environmental services.
              </p>

              {reviewClicked ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <CheckCircle2 size={20} className="mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-green-700 font-medium">
                    Thank you for leaving a review!
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleGoogleReviewClick}
                  className="w-full py-4 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Leave a Google Review
                  <ExternalLink size={14} />
                </button>
              )}

              <p className="text-xs text-slate-400 mt-4">
                Your rating: {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < submittedRating ? "text-yellow-400" : "text-slate-300"}>
                    ★
                  </span>
                ))}
              </p>
            </div>
          ) : (
            // Low rating — thank them and close
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <MessageSquare size={48} className="mx-auto mb-4 text-blue-500" />
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Thank you for your feedback
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                We appreciate you taking the time to share your experience.
                Your feedback helps us improve our services.
                {submittedRating <= 3 && contactPermission && (
                  <span className="block mt-2">A member of our team will be in touch to address your concerns.</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-4">
                Your rating: {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < submittedRating ? "text-yellow-400" : "text-slate-300"}>
                    ★
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Survey form
  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const displayRating = hoveredRating || selectedRating;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[#1B3A2D] text-white">
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          <p className="text-[#7BC143] text-xs font-medium tracking-wide uppercase mb-1">
            Xtract Environmental
          </p>
          <h1 className="text-lg font-bold">How was your experience?</h1>
          {data.projectName && (
            <p className="text-slate-300 text-sm mt-1">{data.projectName}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          {/* Greeting */}
          <p className="text-sm text-slate-600 mb-6 leading-relaxed text-center">
            {data.clientName ? `Hi ${data.clientName}, w` : "W"}e'd love to hear about your
            recent experience with Xtract Environmental Services.
          </p>

          {/* Star Rating */}
          <div className="text-center mb-6">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={40}
                    className={`transition-colors ${
                      star <= displayRating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-sm font-medium text-slate-600">
                {ratingLabels[displayRating]}
              </p>
            )}
          </div>

          {/* Conditional content based on rating */}
          {selectedRating > 0 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {selectedRating <= 3 ? (
                // Low rating — ask for feedback + contact permission
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      What could we improve?
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your experience..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contactPermission}
                      onChange={(e) => setContactPermission(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-600">
                      It's okay to follow up with me about my feedback
                    </span>
                  </label>
                </>
              ) : (
                // High rating — optional comment
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Anything else you'd like to share? <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="We'd love to hear what went well..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 bg-[#1B3A2D] hover:bg-[#264a3a] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Submit Feedback"
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Xtract Environmental Services &bull; Fort Collins, CO
        </p>
      </div>
    </div>
  );
}
