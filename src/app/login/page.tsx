"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTranslation, Language, TranslationKey } from "@/lib/translations";
import Logo from "@/components/Logo";

// Inline base64 logo for instant rendering on the login page (no network request)
const INLINE_LOGO = "data:image/png;base64,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";

import {
  FolderOpen,
  Target,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Puzzle,
  Shield,
  Users,
  FileText,
  Zap,
  ArrowRight,
  CheckCircle,
  ChevronDown,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "CRM & Lead Pipeline",
    description: "Track leads from first contact to signed contract. Automated follow-ups, source tracking, and pipeline analytics.",
  },
  {
    icon: FolderOpen,
    title: "Project Management",
    description: "Manage assessments, abatement projects, and field crews. Real-time status updates and budget tracking.",
  },
  {
    icon: Calendar,
    title: "Scheduling & Time Clock",
    description: "Drag-and-drop crew scheduling with GPS time clock. Workers see their schedule on mobile.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance & Certifications",
    description: "Track CDPHE, EPA, OSHA, and IICRC certifications. Auto-alerts before expiration dates.",
  },
  {
    icon: FileText,
    title: "Estimates & Invoicing",
    description: "Generate professional estimates with COGS calculations. Send invoices through QuickBooks or your accounting system.",
  },
  {
    icon: BarChart3,
    title: "Business Metrics",
    description: "Auto-populated lead counts, revenue tracking, and Google Maps performance by office location.",
  },
  {
    icon: Puzzle,
    title: "Plug-in Integrations",
    description: "Connect QuickBooks, RingCentral, PandaDoc, Gusto, and more. Your tools, your choice.",
  },
  {
    icon: Shield,
    title: "Field Reports & Safety",
    description: "Digital field reports with photo documentation. Incident tracking and safety compliance built in.",
  },
];

const INDUSTRIES = [
  "Asbestos Abatement",
  "Lead Paint Remediation",
  "Mold Remediation",
  "Meth Lab Decontamination",
  "Hazmat Services",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && (saved === "en" || saved === "es")) {
      setLanguage(saved);
    }
  }, []);

  const t = (key: TranslationKey): string => getTranslation(language, key);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password: password.trim(),
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "DatabaseError") {
          setError("Server error. Please try again in a moment.");
        } else {
          setError(t("login.invalidCredentials"));
        }
        setLoading(false);
      } else if (result?.ok) {
        router.push("/dashboard");
      } else {
        setError("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError("Connection error. Please check your internet and try again.");
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setEmail("demo@envirobase.app");
    setPassword("EnviroBase2026!");
    setShowDemo(true);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ─── HERO SECTION ─── */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-6 pt-8 pb-20 lg:pb-28">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16 lg:mb-24">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={INLINE_LOGO} alt="EnviroBase" height={40} style={{ height: 40, width: 'auto' }} className="flex-shrink-0" />
              <span className="text-xl font-bold text-white tracking-tight">
                {process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="mailto:sales@envirobase.app"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Contact Sales <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="#login"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/10 transition-colors"
              >
                Sign In
              </a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Headline */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Purpose-built for environmental services</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
                One platform to run your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
                  entire operation
                </span>
              </h1>

              <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">
                CRM, project management, scheduling, compliance, invoicing, and field reporting — all in one place.
                Built by environmental professionals, for environmental professionals.
              </p>

              {/* Industry tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {INDUSTRIES.map((ind) => (
                  <span
                    key={ind}
                    className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-full"
                  >
                    {ind}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Try the Demo <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-full hover:bg-slate-800 transition-colors"
                >
                  See Features <ChevronDown className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right — Login Form */}
            <div id="login" className="lg:pl-8">
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white">{t("login.title")}</h2>
                  <p className="text-sm text-slate-400 mt-1">{t("login.subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("login.emailLabel")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="email"
                      className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("login.passwordLabel")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="text-right">
                    <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                      Forgot Password?
                    </Link>
                  </div>

                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? t("login.signingIn") : t("login.signIn")}
                  </button>
                </form>

                {/* Demo Access */}
                <div className="mt-5 pt-5 border-t border-slate-800/80">
                  {!showDemo ? (
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="w-full py-2.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors"
                    >
                      Try the Demo
                    </button>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-xs text-slate-400">Demo credentials filled in — click Sign In above</p>
                      <p className="text-[10px] text-slate-500">demo@envirobase.app / EnviroBase2026!</p>
                    </div>
                  )}
                </div>

                {/* Contact sales link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    Interested in EnviroBase?{" "}
                    <a href="mailto:sales@envirobase.app" className="text-emerald-400 hover:text-emerald-300 font-medium">
                      Contact sales
                    </a>
                  </p>
                </div>

                {/* Language selector */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setLanguage("en"); localStorage.setItem("language", "en"); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      language === "en"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-800/40 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLanguage("es"); localStorage.setItem("language", "es"); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      language === "es"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-800/40 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    Español
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Replace your spreadsheets, disconnected tools, and manual processes with a single platform
              designed for environmental service companies.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-5 bg-slate-900/50 border border-slate-800/60 rounded-2xl hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WHITE LABEL / SAAS SECTION ─── */}
      <section className="relative py-20 lg:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">White-Label SaaS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Your brand. Your platform.
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                EnviroBase is fully white-labelable. Deploy it under your own brand with your logo, colors, and domain.
                Each tenant gets their own isolated database, custom integrations, and admin controls.
              </p>
              <ul className="space-y-3">
                {[
                  "Custom branding — your logo, colors, and domain",
                  "Plug-in marketplace — connect your own accounting, phone, and payroll tools",
                  "Role-based access — Admin, Office, Supervisor, and Technician roles",
                  "Multi-language support — English, Spanish, and Portuguese",
                  "Mobile-ready — works on any device with PWA support",
                  "API-first architecture — integrate with anything",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Active Integrations", value: "13+", sub: "and growing" },
                { label: "User Roles", value: "4", sub: "with granular permissions" },
                { label: "Languages", value: "3", sub: "EN / ES / PT" },
                { label: "Compliance Frameworks", value: "5+", sub: "CDPHE, EPA, OSHA..." },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-2xl text-center"
                >
                  <p className="text-3xl font-bold text-emerald-400">{stat.value}</p>
                  <p className="text-xs font-medium text-white mt-1">{stat.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-16 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-slate-400 mb-8">
            Log in with the demo account and explore every feature. No account required.
          </p>
          <a
            href="#login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Try the Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={INLINE_LOGO} alt="EnviroBase" height={24} style={{ height: 24, width: 'auto' }} className="flex-shrink-0" />
            <span className="text-sm font-medium text-slate-500">
              {process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase"} &copy; {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Built by{" "}
            <a href="https://necteraholdings.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">
              Nectera Holdings
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
