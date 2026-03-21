"use client";

import { useState, useEffect } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Target,
  TrendingUp,
  Receipt,
  Building2,
  Users,
  FolderOpen,
  Calendar,
  ClipboardCheck,
  Clock,
  MessageSquare,
  CheckSquare,
  Gift,
  Settings,
  Puzzle,
  BookOpen,
  DollarSign,
  Sparkles,
  Rocket,
} from "lucide-react";

const TOUR_STEPS = [
  {
    id: "welcome",
    icon: Rocket,
    title: "Welcome to Your New Platform",
    subtitle: "Let's take a quick tour",
    description: "We'll walk you through each section of your dashboard so you can hit the ground running. This takes about 2 minutes.",
    color: "#10b981",
  },
  {
    id: "crm",
    section: "Sales & CRM",
    icon: Target,
    title: "CRM & Lead Pipeline",
    subtitle: "Your entire sales operation in one place",
    description: "Track every lead from first contact to signed contract. The CRM dashboard gives you a bird's-eye view of your pipeline, and the Kanban board lets you drag deals through stages.",
    highlights: [
      "Automated lead source tracking — know which channels bring the best ROI",
      "One-click estimate generation from any lead",
      "Pipeline analytics with close rates and revenue forecasting",
      "Company and contact management with full interaction history",
    ],
    color: "#7BC143",
  },
  {
    id: "estimates",
    section: "Sales & CRM",
    icon: Receipt,
    title: "Estimates & Invoicing",
    subtitle: "Professional quotes in minutes",
    description: "Build detailed estimates with built-in COGS calculations for materials, labor, and equipment. Convert approved estimates to invoices with one click.",
    highlights: [
      "COGS-aware pricing — never underquote a job again",
      "PDF generation with your company branding",
      "QuickBooks sync for seamless accounting",
      "Automated drip follow-up sequences for pending estimates",
    ],
    color: "#0068B5",
  },
  {
    id: "projects",
    section: "Project Management",
    icon: FolderOpen,
    title: "Project Management",
    subtitle: "From assessment to close-out",
    description: "Manage every phase of your environmental projects — assessments, abatement, remediation, and close-out. Assign crews, track budgets, and upload field documentation all in one place.",
    highlights: [
      "Real-time project status with color-coded health indicators",
      "Budget tracking against estimates with variance alerts",
      "File attachments and photo documentation per project",
      "Task assignment with deadline tracking",
    ],
    color: "#8B5CF6",
  },
  {
    id: "schedule",
    section: "Project Management",
    icon: Calendar,
    title: "Scheduling & Time Clock",
    subtitle: "Crew management made simple",
    description: "Drag-and-drop scheduling puts the right crews on the right jobs. Workers see their schedule on mobile and clock in/out with GPS verification.",
    highlights: [
      "Visual calendar with crew availability at a glance",
      "GPS-verified time clock — know who's on site",
      "Overtime tracking and labor cost calculations",
      "Workers get push notifications for schedule changes",
    ],
    color: "#F59E0B",
  },
  {
    id: "compliance",
    section: "Project Management",
    icon: ClipboardCheck,
    title: "Compliance & Certifications",
    subtitle: "Never miss an expiration",
    description: "Track every EPA, OSHA, IICRC, and state-level certification across your entire team. The system automatically alerts you before anything expires.",
    highlights: [
      "Auto-alerts 90, 60, and 30 days before expiration",
      "Upload and store certification documents",
      "Compliance dashboard shows team-wide cert status",
      "Block assignment of workers with expired certs",
    ],
    color: "#EF4444",
  },
  {
    id: "field-reports",
    section: "Project Management",
    icon: ClipboardCheck,
    title: "Field Reports & Forms",
    subtitle: "Digital documentation for every phase",
    description: "Replace paper forms with built-in digital reports. Daily Field Reports, Pre-Abatement Inspections, Post-Project Inspections, PSI/JHA/SPA forms, and Certificates of Completion — all tied directly to each project.",
    highlights: [
      "Daily Field Reports with crew, hours, weather, and progress photos",
      "Pre- and post-abatement inspection checklists per regulation",
      "PSI/JHA/SPA safety forms completed on-site from any device",
      "Certificate of Completion generation with e-signatures",
    ],
    color: "#F97316",
  },
  {
    id: "bonus-tasks",
    section: "Project Management",
    icon: Gift,
    title: "Bonus Pool & Tasks",
    subtitle: "Incentivize and track work",
    description: "The Bonus Pool lets you allocate bonuses to workers based on project performance. Task management keeps everyone aligned — assign tasks to team members with deadlines and priority levels.",
    highlights: [
      "Bonus pool tied to projects with transparent allocation",
      "Task assignment with due dates, priority, and status tracking",
      "Workers see their bonuses and tasks on their dashboard",
      "Admin oversight of all bonus distributions and task completion",
    ],
    color: "#10B981",
  },
  {
    id: "chat",
    section: "Communication",
    icon: MessageSquare,
    title: "Team Chat",
    subtitle: "Keep conversations in context",
    description: "Built-in team messaging so you never lose a conversation in personal texts again. Create channels for projects, offices, or topics.",
    highlights: [
      "Project-linked channels keep discussions organized",
      "Direct messages for quick 1-on-1 communication",
      "File sharing and image attachments",
      "One-click video meetings (Google Meet or Zoom) right from any channel",
      "Unread badges so nothing falls through the cracks",
    ],
    color: "#06B6D4",
  },
  {
    id: "ai-assistant",
    section: "AI-Powered",
    icon: Sparkles,
    title: "AI Assistant",
    subtitle: "Your always-on operations manager",
    description: "Ask the AI assistant anything about your business — it has full access to your projects, leads, workers, schedule, and metrics. It can take action too, not just answer questions.",
    highlights: [
      "'Who's available next week?' — instantly checks worker schedules and certs",
      "'Create a lead for Acme Corp' — builds leads, tasks, and activities hands-free",
      "'What's our close rate this quarter?' — pulls live metrics on demand",
      "AI memory — it remembers your preferences and past conversations",
    ],
    color: "#A855F7",
  },
  {
    id: "ai-scheduling",
    section: "AI-Powered",
    icon: Calendar,
    title: "AI-Powered Scheduling",
    subtitle: "Optimal crew assignments in seconds",
    description: "The AI scheduler analyzes worker certifications, proximity to job sites, skill ratings, and availability to recommend the best crew for every project — automatically.",
    highlights: [
      "One-click auto-schedule for the entire week across all projects",
      "Factors in drive time, certs, skill level, and worker preferences",
      "Swap recommendations when someone calls out sick",
      "Difficulty-rated projects matched to appropriately skilled crews",
    ],
    color: "#F59E0B",
  },
  {
    id: "knowledge-base",
    section: "AI-Powered",
    icon: BookOpen,
    title: "Company Knowledge Base",
    subtitle: "Train the AI on your business",
    description: "Upload your SOPs, safety protocols, pricing guides, and training docs. The AI assistant uses your knowledge base to give answers specific to how your company operates.",
    highlights: [
      "Upload documents and the AI learns your processes instantly",
      "New hires can ask the AI instead of bothering senior staff",
      "Consistent answers based on your actual company policies",
      "Keeps institutional knowledge accessible even when people leave",
    ],
    color: "#06B6D4",
  },
  {
    id: "plugins",
    section: "Settings",
    icon: Puzzle,
    title: "Plug-in Marketplace",
    subtitle: "Connect your favorite tools",
    description: "EnviroBase connects to the tools you already use. Enable integrations from the plug-in marketplace with a few clicks.",
    highlights: [
      "QuickBooks — sync invoices and payments automatically",
      "RingCentral — call tracking tied to leads and contacts",
      "PandaDoc — send contracts for e-signature",
      "Gusto — payroll integration with time clock data",
    ],
    color: "#EC4899",
  },
  {
    id: "branding",
    section: "Settings",
    icon: Sparkles,
    title: "Your Brand, Your Platform",
    subtitle: "Make it yours",
    description: "Head to Settings → Branding to upload your logo and set your company colors. Everything updates instantly — the header, accent strip, and even the avatar gradient will match your brand.",
    highlights: [
      "Upload your logo and colors auto-extract from it",
      "Custom company name throughout the platform",
      "Support email and company details",
      "Your team sees your brand, not ours",
    ],
    color: "#7BC143",
  },
];

const STORAGE_KEY = "envirobase-onboarding-complete";

export default function OnboardingTour({ isDemo }: { isDemo?: boolean }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isDemo) localStorage.removeItem(STORAGE_KEY);
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem(STORAGE_KEY, "true");
    }, 300);
  };

  const handleNext = () => {
    if (step === TOUR_STEPS.length - 1) {
      handleClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  if (!show) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Colored accent bar */}
        <div className="h-1" style={{ background: current.color }} />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/60 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Section badge */}
          {current.section && (
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full mb-4"
              style={{ color: current.color, background: `${current.color}15`, border: `1px solid ${current.color}30` }}
            >
              {current.section}
            </span>
          )}

          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${current.color}15` }}
            >
              <Icon className="w-6 h-6" style={{ color: current.color }} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{current.title}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{current.subtitle}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            {current.description}
          </p>

          {/* Highlights */}
          {current.highlights && (
            <div className="space-y-2.5 mb-6">
              {current.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${current.color}20` }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: current.color }}>{i + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{h}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-900/50 border-t border-slate-800/60 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step ? "w-6 h-2" : "w-2 h-2 hover:opacity-80"
                }`}
                style={{
                  background: i === step ? current.color : i < step ? `${current.color}60` : "#334155",
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {isFirst && (
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                Skip tour
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-lg"
              style={{ background: current.color, boxShadow: `0 4px 14px ${current.color}30` }}
            >
              {isLast ? "Get Started" : isFirst ? "Start Tour" : "Next"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
