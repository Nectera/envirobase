"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Building2,
  User,
  Mail,
  Lock,
  Globe,
  Zap,
  Star,
  Crown,
} from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$599",
    period: "/month",
    icon: Zap,
    description: "For growing operations",
    color: "blue",
    features: [
      "Up to 10 users",
      "Up to 25 workers",
      "CRM & contacts",
      "Project management",
      "Scheduling & time clock",
      "Compliance tracking",
      "Business metrics & analytics",
      "Team chat & lead pipeline",
    ],
    limits: "10 users, 25 workers",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$799",
    period: "/month",
    icon: Star,
    popular: true,
    description: "Full platform for established companies",
    color: "emerald",
    features: [
      "Up to 25 users",
      "Up to 50 workers",
      "Everything in Starter, plus:",
      "Content inventory & reviews",
      "AI assistant & knowledge base",
      "Bonus pool tracking",
    ],
    limits: "25 users, 50 workers",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    icon: Crown,
    description: "For large multi-location teams",
    color: "purple",
    features: [
      "Up to 100 users",
      "Up to 500 workers",
      "Everything in Pro, plus:",
      "Custom integrations",
      "Priority support",
      "Custom branding & domain",
    ],
    limits: "100 users, 500 workers",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "details">("plan");
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Auto-generate slug from company name
  function handleCompanyChange(value: string) {
    setCompanyName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(autoSlug);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (adminPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (slug.length < 3) {
      setError("Organization URL must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/organizations/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          slug,
          adminName,
          adminEmail: adminEmail.toLowerCase().trim(),
          adminPassword,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      // Auto-login after signup
      const signInResult = await signIn("credentials", {
        email: adminEmail.toLowerCase().trim(),
        password: adminPassword,
        redirect: false,
      });

      if (signInResult?.ok) {
        // For paid plans, redirect to Stripe checkout
        if (selectedPlan !== "enterprise") {
          try {
            const checkoutRes = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgId: data.organization.id, plan: selectedPlan }),
            });
            const checkoutData = await checkoutRes.json();
            if (checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
          } catch {
            // Stripe checkout failed — still send to dashboard
          }
        }
        router.push("/dashboard");
      } else {
        // Account created but auto-login failed — send to login page
        router.push("/login");
      }
    } catch (err) {
      setError("Connection error. Please check your internet and try again.");
      setLoading(false);
    }
  }

  const activePlan = PLANS.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 -z-10" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 -z-10" />

      <div className="max-w-6xl mx-auto px-6 py-8 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-12">
          <Link href="/login" className="flex items-center gap-3">
            <Logo size={36} className="" />
            <span className="text-lg font-bold text-white tracking-tight">EnviroBase</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </nav>

        {/* Step 1: Plan Selection */}
        {step === "plan" && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Choose your plan</h1>
              <p className="text-slate-400 max-w-lg mx-auto">
                Start with the plan that fits your team. You can upgrade or downgrade anytime.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const Icon = plan.icon;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative text-left p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30"
                        : "bg-slate-900/60 border-slate-800/60 hover:border-slate-700"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full">
                        Most Popular
                      </span>
                    )}

                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`p-1.5 rounded-lg ${isSelected ? "bg-emerald-500/20" : "bg-slate-800"}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                      </div>
                      <span className={`font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {plan.name}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="text-2xl font-bold text-white">{plan.price}</span>
                      <span className="text-sm text-slate-500">{plan.period}</span>
                    </div>

                    <p className="text-xs text-slate-500 mb-3">{plan.description}</p>

                    <ul className="space-y-1.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <Check className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-600"}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <button
                onClick={() => setStep("details")}
                className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Continue with {activePlan?.name} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Account Details */}
        {step === "details" && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setStep("plan")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change plan
            </button>

            {/* Plan badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                {activePlan?.name} Plan — {activePlan?.price}{activePlan?.period}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-sm text-slate-400 mb-8">Set up your organization and admin account to get started.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Company Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="Acme Environmental Services"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Organization URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="acme-environmental"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">envirobase.app/org/{slug || "your-company"}</p>
                </div>
              </div>

              {/* Admin Account */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Account</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="John Smith"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="john@acme-enviro.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    Create Account <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
