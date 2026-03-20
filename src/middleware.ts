import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ── Feature-flag route map (inlined for Edge runtime compatibility) ──
const FEATURE_ROUTE_MAP: Record<string, string> = {
  "/metrics": "metrics",
  "/chat": "chat",
  "/pipeline": "pipeline",
  "/bonus-pool": "bonusPool",
  "/content-inventory": "contentInventory",
  "/knowledge-base": "knowledgeBase",
  "/review-requests": "reviewRequests",
  "/api/assistant": "aiAssistant",
};

const FEATURE_LABELS: Record<string, string> = {
  metrics: "Business Metrics",
  chat: "Team Chat",
  pipeline: "Sales Pipeline",
  bonusPool: "Bonus Pool",
  contentInventory: "Content Inventory",
  knowledgeBase: "Knowledge Base",
  reviewRequests: "Review Requests",
  aiAssistant: "AI Assistant",
};

// Routes technicians are allowed to access
const TECHNICIAN_ALLOWED = ["/schedule", "/time-clock", "/my-documents", "/tasks"];

// Routes office/sales staff are allowed to access
const OFFICE_ALLOWED = ["/crm", "/leads", "/companies", "/contacts", "/estimates", "/tasks", "/pipeline"];

// Routes that don't need auth
const PUBLIC_ROUTES = ["/login", "/signup", "/api/auth", "/api/organizations/signup", "/api/stripe/webhook", "/forgot-password", "/reset-password", "/privacy", "/terms"];

// Security headers applied to all responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=(self)"
  );
  // XSS protection (legacy, but harmless)
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // Content Security Policy — allow unsafe-eval in dev for Next.js HMR
  const isDev = process.env.NODE_ENV === "development";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://*.googleapis.com${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.googleapis.com",
      "img-src 'self' data: blob: https: https://maps.gstatic.com https://maps.googleapis.com https://*.gstatic.com https://*.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com https://*.gstatic.com",
      "connect-src 'self' https://api.anthropic.com https://*.anthropic.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.sentry.io https://*.ingest.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  // Strict Transport Security (HTTPS only)
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Skip public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Get the JWT token
  const token = await getToken({ req: request });

  // Not authenticated — redirect to login (except API routes)
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(NextResponse.next());
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const isApi = pathname.startsWith("/api/");
  const isRoot = pathname === "/";

  // ── Demo user: read-only mode ──
  // Block all mutating API requests for demo accounts
  if (token.isDemo && isApi) {
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      // Allow a few safe POST endpoints that are read-like
      const safePostRoutes = [
        "/api/auth",           // NextAuth session management
        "/api/search",         // Search is read-only
        "/api/data/export",    // Export is read-only
        "/api/data/import/preview", // Preview is read-only
      ];
      const isSafe = safePostRoutes.some((r) => pathname.startsWith(r));
      if (!isSafe) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: "Demo account is read-only. Contact us to get started with your own account." },
            { status: 403 }
          )
        );
      }
    }
  }

  // ── Feature flag enforcement ──
  // Block routes that require features the org hasn't paid for
  const features = (token.features as Record<string, boolean>) || {};
  for (const [route, featureKey] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      if (features[featureKey] !== true) {
        const label = FEATURE_LABELS[featureKey] || featureKey;
        if (isApi) {
          return addSecurityHeaders(
            NextResponse.json(
              { error: `${label} is not included in your current plan. Please upgrade to access this feature.` },
              { status: 403 }
            )
          );
        }
        // Redirect to dashboard with upgrade param
        const upgradeUrl = new URL("/dashboard", request.url);
        upgradeUrl.searchParams.set("upgrade", featureKey);
        return addSecurityHeaders(NextResponse.redirect(upgradeUrl));
      }
      break; // matched route, no need to check further
    }
  }

  // Admin dashboard — ADMIN only
  if (pathname.startsWith("/admin")) {
    if (token.role !== "ADMIN") {
      return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)));
    }
  }

  // Technician route protection
  if (token.role === "TECHNICIAN") {
    const isAllowed = TECHNICIAN_ALLOWED.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (!isAllowed && !isApi && !isRoot) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/schedule", request.url)));
    }
  }

  // Office route protection
  if (token.role === "OFFICE") {
    const isAllowed = OFFICE_ALLOWED.some((r) => pathname === r || pathname.startsWith(r + "/"));
    if (!isAllowed && !isApi && !isRoot) {
      return addSecurityHeaders(NextResponse.redirect(new URL("/crm", request.url)));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
