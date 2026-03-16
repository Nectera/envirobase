"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getTranslation, Language, TranslationKey } from "@/lib/translations";
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
    setPassword("demo123");
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
              <img
                src="/logo.svg"
                alt="EnviroBase"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-white tracking-tight">
                {process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/signup"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Link>
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
                      <p className="text-[10px] text-slate-500">demo@envirobase.app / demo123</p>
                    </div>
                  )}
                </div>

                {/* Signup link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
                      Get started
                    </Link>
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
            Log in with the demo account and explore every feature. No credit card, no signup required.
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
            <img
              src="/logo.svg"
              alt="EnviroBase"
              width={24}
              height={24}
              className="rounded-md"
            />
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
