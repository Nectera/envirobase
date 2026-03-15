import { z } from "zod";
import { logger } from "./logger";

// Define the environment variable schema
const envSchema = z.object({
  // NextAuth Configuration (Required)
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().optional(),

  // Anthropic API (Optional - AI features degrade gracefully)
  ANTHROPIC_API_KEY: z.string().optional(),

  // Google Places API (Optional)
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_PLACES_API_KEY: z.string().optional(),

  // Email/SMTP Configuration (Optional - email features degrade)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),

  // QuickBooks Configuration (Optional)
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_REDIRECT_URI: z.string().optional(),
  QUICKBOOKS_ENVIRONMENT: z.string().optional(),

  // RingCentral Configuration (Optional)
  RINGCENTRAL_CLIENT_ID: z.string().optional(),
  RINGCENTRAL_CLIENT_SECRET: z.string().optional(),
  RINGCENTRAL_REDIRECT_URI: z.string().optional(),
  RINGCENTRAL_SERVER_URL: z.string().optional(),

  // PandaDoc Configuration (Optional)
  PANDADOC_API_KEY: z.string().optional(),

  // Gusto Configuration (Optional)
  GUSTO_CLIENT_ID: z.string().optional(),
  GUSTO_CLIENT_SECRET: z.string().optional(),
  GUSTO_REDIRECT_URI: z.string().optional(),
  GUSTO_ENVIRONMENT: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof envSchema>;

// Validate environment variables at startup
function validateEnv(): Env {
  const isProduction = process.env.NODE_ENV === "production";

  // First, try to validate what we have
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  - ${key}: ${messages?.join(", ") || "Invalid"}`)
      .join("\n");

    const message = `Environment validation failed:\n${errorMessages}`;

    if (isProduction) {
      logger.error(message);
      throw new Error(message);
    } else {
      logger.warn(message);
    }
  }

  // Warn about missing optional variables in development
  if (!isProduction) {
    const optionalVars = [
      "ANTHROPIC_API_KEY",
      "GOOGLE_PLACES_API_KEY",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "QUICKBOOKS_CLIENT_ID",
      "RINGCENTRAL_CLIENT_ID",
      "PANDADOC_API_KEY",
      "GUSTO_CLIENT_ID",
    ];

    optionalVars.forEach((varName) => {
      if (!process.env[varName]) {
        logger.warn(`Optional environment variable not set: ${varName}. Related features may be degraded.`, {
          variable: varName,
        });
      }
    });
  }

  // Return validated environment
  return result.data as Env;
}

// Validate and export
export const env = validateEnv();

// Helper function to check if a feature is available
export function isFeatureAvailable(feature: "ai" | "maps" | "email" | "quickbooks" | "ringcentral" | "pandadoc" | "gusto"): boolean {
  switch (feature) {
    case "ai":
      return !!env.ANTHROPIC_API_KEY;
    case "maps":
      return !!env.GOOGLE_PLACES_API_KEY;
    case "email":
      return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD);
    case "quickbooks":
      return !!(env.QUICKBOOKS_CLIENT_ID && env.QUICKBOOKS_CLIENT_SECRET);
    case "ringcentral":
      return !!(env.RINGCENTRAL_CLIENT_ID && env.RINGCENTRAL_CLIENT_SECRET);
    case "pandadoc":
      return !!env.PANDADOC_API_KEY;
    case "gusto":
      return !!(env.GUSTO_CLIENT_ID && env.GUSTO_CLIENT_SECRET);
    default:
      return false;
  }
}
