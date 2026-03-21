import { prisma } from "./prisma";

// User roles
export type UserRole = "ADMIN" | "PROJECT_MANAGER" | "SUPERVISOR" | "TECHNICIAN" | "OFFICE";

export function isAdmin(role: string | undefined | null): boolean {
  return role === "ADMIN";
}

export function isProjectManager(role: string | undefined | null): boolean {
  return role === "PROJECT_MANAGER";
}

export function isAdminOrPM(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "PROJECT_MANAGER";
}

export function isPMRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "PROJECT_MANAGER" || role === "SUPERVISOR";
}

export function isSupervisor(role: string | undefined | null): boolean {
  return role === "SUPERVISOR";
}

export function isAdminOrSupervisor(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPERVISOR";
}

export function isTechnician(role: string | undefined | null): boolean {
  return role === "TECHNICIAN";
}

export function isOffice(role: string | undefined | null): boolean {
  return role === "OFFICE";
}

// Technician-accessible routes
const TECHNICIAN_ROUTES = ["/schedule", "/time-clock", "/my-documents", "/tasks", "/bonus-pool", "/chat", "/settings/notifications", "/compliance"];

// Office/Sales-accessible routes
const OFFICE_ROUTES = ["/crm", "/leads", "/companies", "/contacts", "/estimates"];

// Project Manager-accessible routes
const PROJECT_MANAGER_ROUTES = [
  "/dashboard", "/projects", "/schedule", "/time-clock",
  "/field-reports", "/psi-jha-spa", "/pre-abatement-inspection",
  "/post-project-inspection", "/certificate-of-completion",
  "/calendar", "/workers", "/tasks", "/chat",
  "/settings/notifications", "/bonus-pool", "/data-management", "/incidents",
];

// Supervisor-accessible routes — projects, forms, schedule, time clock, chat
const SUPERVISOR_ROUTES = [
  "/projects", "/schedule", "/time-clock",
  "/field-reports", "/psi-jha-spa", "/pre-abatement-inspection",
  "/post-project-inspection", "/certificate-of-completion",
  "/chat", "/settings/notifications", "/bonus-pool", "/compliance",
];

export function canAccessRoute(role: string | undefined | null, pathname: string): boolean {
  if (isAdmin(role)) return true;
  if (isProjectManager(role)) return PROJECT_MANAGER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (isSupervisor(role)) return SUPERVISOR_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  if (isOffice(role)) return OFFICE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  // Technicians can only access their allowed routes
  return TECHNICIAN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

// Find the worker record linked to a user
export async function getWorkerForUser(userId: string) {
  const workers = await prisma.worker.findMany();
  return workers.find((w: any) => w.userId === userId) || null;
}
