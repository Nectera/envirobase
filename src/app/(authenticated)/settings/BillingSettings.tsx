"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Star,
  Crown,
} from "lucide-react";

interface BillingInfo {
  plan: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingEmail: string | null;
  maxUsers: number;
  maxWorkers: number;
}

const PLAN_ICONS: Record<string, any> = {
  starter: Zap,
  pro: Star,
  enterprise: Crown,
};

const PLAN_PRICES: Record<string, string> = {
  starter: "$599/mo",
  pro: "$799/mo",
  enterprise: "Custom",
};

export default function BillingSettings() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBilling();
  }, []);

  async function fetchBilling() {
    try {
      const res = await fetch("/api/settings/billing");
      if (res.ok) {
        const data = await res.json();
        setBilling(data);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal");
        setPortalLoading(false);
      }
    } catch {
      setError("Failed to connect to billing service");
      setPortalLoading(false);
    }
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billing?.plan || "starter" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout");
        setCheckoutLoading(false);
      }
    } catch {
      setError("Failed to connect to billing service");
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const PlanIcon = PLAN_ICONS[billing?.plan || "starter"] || Zap;
  const hasSubscription = !!billing?.stripeSubscriptionId;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-slate-400" /> Subscription & Billing
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <PlanIcon className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 capitalize">{billing?.plan || "Starter"} Plan</p>
              <p className="text-sm text-slate-500">{PLAN_PRICES[billing?.plan || "starter"]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {billing?.status === "active" && hasSubscription && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
            {billing?.status === "active" && !hasSubscription && (
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                <AlertTriangle className="w-3 h-3" /> No payment method
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <span className="text-slate-500">Max Users:</span>{" "}
            <span className="font-medium text-slate-700">{billing?.maxUsers || 0}</span>
          </div>
          <div>
            <span className="text-slate-500">Max Workers:</span>{" "}
            <span className="font-medium text-slate-700">{billing?.maxWorkers || 0}</span>
          </div>
          {billing?.billingEmail && (
            <div className="col-span-2">
              <span className="text-slate-500">Billing Email:</span>{" "}
              <span className="font-medium text-slate-700">{billing.billingEmail}</span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          {hasSubscription ? (
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage Billing
            </button>
          ) : (
            <button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Set Up Billing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
