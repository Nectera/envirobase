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
              <img src={INLINE_LOGO} alt="EnviroBase" width={40} height={40} className="flex-shrink-0" />
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
            <img src={INLINE_LOGO} alt="EnviroBase" width={24} height={24} className="flex-shrink-0" />
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
