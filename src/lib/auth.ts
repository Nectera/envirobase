import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit } from "./rateLimit";
import { logger } from "./logger";

// Demo account email — this user gets read-only access
export const DEMO_EMAIL = "demo@envirobase.app";

// Platform admin emails — only these users can access /admin (tenant management, platform health, etc.)
// Set PLATFORM_ADMIN_EMAILS as a comma-separated list in your environment variables
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || "cody@envirobase.app")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Normalize inputs — mobile keyboards add capitals, spaces, hidden chars
        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password.trim();

        // Rate limit by IP
        let clientIp = "unknown";
        try {
          const h = req?.headers;
          const fwd = typeof h?.get === "function" ? h.get("x-forwarded-for") : (h as any)?.["x-forwarded-for"];
          const real = typeof h?.get === "function" ? h.get("x-real-ip") : (h as any)?.["x-real-ip"];
          clientIp = (typeof fwd === "string" ? fwd.split(",")[0] : real) || "unknown";
        } catch { /* ignore */ }

        const rateLimitKey = `login:${clientIp}`;
        const rateLimitResult = checkRateLimit(rateLimitKey, {
          maxRequests: 20,
          windowSeconds: 60,
        });

        if (!rateLimitResult.allowed) {
          logger.warn("Login rate limit exceeded", { ip: clientIp, email });
          return null;
        }

        try {
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: { organization: { select: { id: true, slug: true, status: true } } },
          });

          if (!user) {
            logger.warn("Login: user not found", { ip: clientIp, email });
            return null;
          }

          const isValid = await compare(password, user.passwordHash);
          if (!isValid) {
            logger.warn("Login: wrong password", { ip: clientIp, email });
            return null;
          }

          // Block login if organization is suspended or cancelled
          if (user.organization && !["active", "trialing"].includes(user.organization.status)) {
            logger.warn("Login: organization inactive", { ip: clientIp, email, orgStatus: user.organization.status });
            return null;
          }

          logger.audit("login", { userId: user.id, email: user.email, ip: clientIp, organizationId: user.organizationId });

          const normalizedEmail = user.email.toLowerCase();
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            isDemo: normalizedEmail === DEMO_EMAIL,
            isPlatformAdmin: PLATFORM_ADMIN_EMAILS.includes(normalizedEmail),
          };
        } catch (err: any) {
          logger.error("Login: database error", { error: err.message, email });
          // Throw so NextAuth returns a distinct error rather than "CredentialsSignin"
          throw new Error("DatabaseError");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.organizationId = (user as any).organizationId;
        token.isDemo = (user as any).isDemo || false;
        token.isPlatformAdmin = (user as any).isPlatformAdmin || false;
        // Load org features for feature gating
        if ((user as any).organizationId) {
          try {
            const org = await prisma.organization.findUnique({
              where: { id: (user as any).organizationId },
              select: { plan: true, features: true },
            });
            if (org) {
              token.plan = org.plan;
              token.features = (org.features as Record<string, boolean>) || {};
            }
          } catch { /* ignore */ }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).isDemo = token.isDemo || false;
        (session.user as any).isPlatformAdmin = token.isPlatformAdmin || false;
        (session.user as any).plan = token.plan || "starter";
        (session.user as any).features = token.features || {};
      }
      return session;
    },
  },
};
