import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

export function generateProjectNumber(type: string): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 999) + 1;
  return `PRJ-${year}-${String(num).padStart(3, "0")}`;
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ASBESTOS: "text-indigo-500 bg-indigo-50 border-indigo-200",
    LEAD: "text-amber-500 bg-amber-50 border-amber-200",
    METH: "text-red-500 bg-red-50 border-red-200",
    MOLD: "text-teal-500 bg-teal-50 border-teal-200",
    SELECT_DEMO: "text-orange-500 bg-orange-50 border-orange-200",
    REBUILD: "text-violet-500 bg-violet-50 border-violet-200",
  };
  return colors[(type || "").toUpperCase()] || "text-gray-500 bg-gray-50 border-gray-200";
}

export function getTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    ASBESTOS: "bg-indigo-100 text-indigo-700",
    LEAD: "bg-amber-100 text-amber-700",
    METH: "bg-red-100 text-red-700",
    MOLD: "bg-teal-100 text-teal-700",
    SELECT_DEMO: "bg-orange-100 text-orange-700",
    REBUILD: "bg-violet-100 text-violet-700",
  };
  return colors[(type || "").toUpperCase()] || "bg-gray-100 text-gray-700";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-blue-100 text-blue-700",
    pending: "bg-gray-100 text-gray-600",
    planning: "bg-violet-100 text-violet-700",
    assessment: "bg-amber-100 text-amber-700",
    on_hold: "bg-gray-100 text-gray-500",
    active: "bg-emerald-100 text-emerald-700",
    expiring_soon: "bg-amber-100 text-amber-700",
    expired: "bg-red-100 text-red-700",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: "border-l-red-500 bg-red-50",
    warning: "border-l-amber-500 bg-amber-50",
    info: "border-l-blue-500 bg-blue-50",
  };
  return colors[severity] || "border-l-gray-500 bg-gray-50";
}

export function getProgressColor(type: string): string {
  const colors: Record<string, string> = {
    ASBESTOS: "bg-indigo-500",
    LEAD: "bg-amber-500",
    METH: "bg-red-500",
  };
  return colors[type.toUpperCase()] || "bg-gray-500";
}

/** Parse a comma-separated project type string into an array of uppercase types */
export function getProjectTypes(typeString: string | null | undefined): string[] {
  if (!typeString) return [];
  return typeString.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
}

/** Check if a comma-separated type string contains a specific type */
export function hasProjectType(typeString: string | null | undefined, targetType: string): boolean {
  return getProjectTypes(typeString).includes(targetType.toUpperCase());
}
