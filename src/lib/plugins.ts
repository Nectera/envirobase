// ─── Plugin Registry ─────────────────────────────────────────────
// Defines all available integrations for the EnviroBase plugin system.
// Each plugin is config-driven: the registry defines metadata and auth
// patterns, while IntegrationAuth tracks per-tenant connection state.

export type PluginCategory = "accounting" | "communication" | "documents" | "payroll" | "other";
export type PluginAuthType = "oauth" | "api_key" | "connector";

export interface PluginDefinition {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  category: PluginCategory;
  authType: PluginAuthType;
  iconColor: string;     // Tailwind bg color class for icon circle
  iconTextColor: string; // Tailwind text color class for icon
  brandColor: string;    // Tailwind bg color class for connect button
  brandHoverColor: string;
  // Environment variables required for this plugin to be available
  requiredEnvVars: string[];
  // API routes (relative to /api/)
  authRoute?: string;
  statusRoute: string;
  callbackRoute?: string;
  // Setup instructions for admin
  setupSteps: string[];
  // What connecting this plugin enables
  features: string[];
  // Optional: URL to the service's developer portal
  devPortalUrl?: string;
  // Is this a "coming soon" placeholder?
  comingSoon?: boolean;
}

export const PLUGIN_CATEGORIES: Record<PluginCategory, { label: string; description: string }> = {
  accounting: {
    label: "Accounting",
    description: "Sync invoices, payments, and financial data",
  },
  communication: {
    label: "Communication",
    description: "Phone, SMS, and messaging integrations",
  },
  documents: {
    label: "Documents & E-Sign",
    description: "Send proposals, contracts, and collect signatures",
  },
  payroll: {
    label: "Payroll & HR",
    description: "Employee management, payroll, and onboarding",
  },
  other: {
    label: "Other",
    description: "Additional integrations and tools",
  },
};

export const PLUGINS: PluginDefinition[] = [
  // ─── Accounting ──────────────────────────────────────────────
  {
    slug: "quickbooks",
    name: "QuickBooks Online",
    description: "Sync invoices and payments with QuickBooks Online",
    longDescription: "Connect your QuickBooks Online account to automatically sync invoices. When you send an invoice from the app, it will be created in QuickBooks and emailed to the customer.",
    category: "accounting",
    authType: "oauth",
    iconColor: "bg-green-100",
    iconTextColor: "text-green-700",
    brandColor: "bg-green-600",
    brandHoverColor: "hover:bg-green-700",
    requiredEnvVars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"],
    authRoute: "quickbooks/auth",
    statusRoute: "quickbooks/status",
    callbackRoute: "quickbooks/callback",
    setupSteps: [
      "Create an app at developer.intuit.com",
      "Add your Client ID and Secret to environment variables",
      "Set redirect URI in your Intuit app settings",
      "Click Connect to authorize",
    ],
    features: [
      "Auto-create invoices in QuickBooks when sent from the app",
      "Sync payment status back to projects",
      "Customer records stay in sync",
    ],
    devPortalUrl: "https://developer.intuit.com",
  },
  {
    slug: "quickbooks-desktop",
    name: "QuickBooks Desktop",
    description: "Sync with QuickBooks Desktop via cloud connector",
    longDescription: "Connect your QuickBooks Desktop installation through Conductor, a secure cloud middleware. No local software to install — Conductor syncs your QB Desktop file to a cloud API that EnviroBase connects to seamlessly.",
    category: "accounting",
    authType: "connector",
    iconColor: "bg-emerald-100",
    iconTextColor: "text-emerald-700",
    brandColor: "bg-emerald-600",
    brandHoverColor: "hover:bg-emerald-700",
    requiredEnvVars: ["CONDUCTOR_API_KEY", "CONDUCTOR_SECRET_KEY"],
    statusRoute: "quickbooks-desktop/status",
    setupSteps: [
      "Sign up for a Conductor account at conductor.is",
      "Install the Conductor connector on the machine running QB Desktop",
      "Add your Conductor API Key and Secret to environment variables",
      "Click Connect to link your QuickBooks Desktop company file",
    ],
    features: [
      "Sync invoices, customers, and payments with QB Desktop",
      "No Web Connector or local SOAP service needed",
      "Cloud-based — works even when QB Desktop is closed",
    ],
    devPortalUrl: "https://conductor.is",
  },
  {
    slug: "xero",
    name: "Xero",
    description: "Cloud accounting for small businesses",
    longDescription: "Connect Xero to sync invoices, contacts, and payments. Perfect for businesses that prefer Xero over QuickBooks.",
    category: "accounting",
    authType: "oauth",
    iconColor: "bg-sky-100",
    iconTextColor: "text-sky-700",
    brandColor: "bg-sky-600",
    brandHoverColor: "hover:bg-sky-700",
    requiredEnvVars: ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET"],
    statusRoute: "xero/status",
    setupSteps: [],
    features: ["Invoice syncing", "Contact management", "Payment tracking"],
    comingSoon: true,
  },
  {
    slug: "freshbooks",
    name: "FreshBooks",
    description: "Invoicing and accounting made simple",
    longDescription: "Connect FreshBooks for seamless invoice creation and expense tracking.",
    category: "accounting",
    authType: "oauth",
    iconColor: "bg-blue-100",
    iconTextColor: "text-blue-700",
    brandColor: "bg-blue-600",
    brandHoverColor: "hover:bg-blue-700",
    requiredEnvVars: ["FRESHBOOKS_CLIENT_ID", "FRESHBOOKS_CLIENT_SECRET"],
    statusRoute: "freshbooks/status",
    setupSteps: [],
    features: ["Invoice syncing", "Expense tracking", "Time tracking"],
    comingSoon: true,
  },

  // ─── Communication ───────────────────────────────────────────
  {
    slug: "ringcentral",
    name: "RingCentral",
    description: "Click-to-call and SMS from within the app",
    longDescription: "Connect RingCentral to enable click-to-call, SMS messaging, and call logging directly from contact and lead records.",
    category: "communication",
    authType: "oauth",
    iconColor: "bg-orange-100",
    iconTextColor: "text-orange-700",
    brandColor: "bg-orange-600",
    brandHoverColor: "hover:bg-orange-700",
    requiredEnvVars: ["RINGCENTRAL_CLIENT_ID", "RINGCENTRAL_CLIENT_SECRET"],
    authRoute: "ringcentral/auth",
    statusRoute: "ringcentral/status",
    callbackRoute: "ringcentral/callback",
    setupSteps: [
      "Create a REST API app at developers.ringcentral.com",
      "Add scopes: ReadAccounts, ReadCallLog, RingOut, SMS",
      "Set redirect URI in your RingCentral app settings",
      "Click Connect to authorize",
    ],
    features: [
      "Click-to-call from any contact or lead",
      "Send SMS directly from the app",
      "Call logs automatically attached to records",
    ],
    devPortalUrl: "https://developers.ringcentral.com",
  },
  {
    slug: "vonage",
    name: "Vonage",
    description: "Business phone and messaging platform",
    longDescription: "Connect Vonage for VoIP calling, SMS, and team messaging capabilities.",
    category: "communication",
    authType: "api_key",
    iconColor: "bg-purple-100",
    iconTextColor: "text-purple-700",
    brandColor: "bg-purple-600",
    brandHoverColor: "hover:bg-purple-700",
    requiredEnvVars: ["VONAGE_API_KEY", "VONAGE_API_SECRET"],
    statusRoute: "vonage/status",
    setupSteps: [],
    features: ["VoIP calling", "SMS messaging", "Call recording"],
    comingSoon: true,
  },
  {
    slug: "twilio",
    name: "Twilio",
    description: "Programmable voice, SMS, and messaging",
    longDescription: "Connect Twilio for flexible SMS notifications, automated call routing, and communication workflows.",
    category: "communication",
    authType: "api_key",
    iconColor: "bg-red-100",
    iconTextColor: "text-red-700",
    brandColor: "bg-red-600",
    brandHoverColor: "hover:bg-red-700",
    requiredEnvVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    statusRoute: "twilio/status",
    setupSteps: [],
    features: ["SMS notifications", "Automated calls", "Two-way messaging"],
    comingSoon: true,
  },

  // ─── Documents ───────────────────────────────────────────────
  {
    slug: "pandadoc",
    name: "PandaDoc",
    description: "Send proposals and contracts for e-signature",
    longDescription: "Connect PandaDoc to send proposals, contracts, and other documents for e-signature directly from the app. Documents created from estimates will auto-populate with line items and contact info.",
    category: "documents",
    authType: "api_key",
    iconColor: "bg-violet-100",
    iconTextColor: "text-violet-700",
    brandColor: "bg-violet-600",
    brandHoverColor: "hover:bg-violet-700",
    requiredEnvVars: [],  // API key entered by user, no env var needed
    statusRoute: "pandadoc/status",
    setupSteps: [
      "Go to Settings → API and Integrations → Dev Center in PandaDoc",
      "Generate a Sandbox or Production API key",
      "Paste it below and click Connect",
    ],
    features: [
      "Send proposals from estimates with one click",
      "E-signature collection from clients",
      "Document status tracking in activity feed",
    ],
    devPortalUrl: "https://developers.pandadoc.com",
  },
  {
    slug: "docusign",
    name: "DocuSign",
    description: "Electronic signature and agreement management",
    longDescription: "Connect DocuSign for enterprise-grade electronic signatures and document workflow automation.",
    category: "documents",
    authType: "oauth",
    iconColor: "bg-yellow-100",
    iconTextColor: "text-yellow-700",
    brandColor: "bg-yellow-600",
    brandHoverColor: "hover:bg-yellow-700",
    requiredEnvVars: ["DOCUSIGN_CLIENT_ID", "DOCUSIGN_CLIENT_SECRET"],
    statusRoute: "docusign/status",
    setupSteps: [],
    features: ["E-signatures", "Document templates", "Audit trail"],
    comingSoon: true,
  },

  // ─── Payroll & HR ────────────────────────────────────────────
  {
    slug: "gusto",
    name: "Gusto",
    description: "Payroll, benefits, and HR management",
    longDescription: "Connect your Gusto account to sync employees with workers, view payroll data, and manage onboarding from within the app.",
    category: "payroll",
    authType: "oauth",
    comingSoon: true,
    iconColor: "bg-rose-100",
    iconTextColor: "text-rose-700",
    brandColor: "bg-rose-600",
    brandHoverColor: "hover:bg-rose-700",
    requiredEnvVars: ["GUSTO_CLIENT_ID", "GUSTO_CLIENT_SECRET"],
    authRoute: "gusto/auth",
    statusRoute: "gusto/status",
    callbackRoute: "gusto/callback",
    setupSteps: [
      "Create an app at dev.gusto.com",
      "Add your Client ID and Secret to environment variables",
      "Set redirect URI in your Gusto app settings",
      "Click Connect to authorize",
    ],
    features: [
      "Sync employees with worker profiles",
      "View payroll history and reports",
      "Streamline new hire onboarding",
    ],
    devPortalUrl: "https://dev.gusto.com",
  },
  {
    slug: "adp",
    name: "ADP",
    description: "Enterprise payroll and HR solutions",
    longDescription: "Connect ADP for enterprise-grade payroll processing, time tracking, and HR management.",
    category: "payroll",
    authType: "oauth",
    iconColor: "bg-red-100",
    iconTextColor: "text-red-700",
    brandColor: "bg-red-600",
    brandHoverColor: "hover:bg-red-700",
    requiredEnvVars: ["ADP_CLIENT_ID", "ADP_CLIENT_SECRET"],
    statusRoute: "adp/status",
    setupSteps: [],
    features: ["Payroll processing", "Time tracking", "Benefits administration"],
    comingSoon: true,
  },
  {
    slug: "paychex",
    name: "Paychex",
    description: "Payroll and HR for growing businesses",
    longDescription: "Connect Paychex for payroll processing, tax filing, and workforce management.",
    category: "payroll",
    authType: "oauth",
    iconColor: "bg-blue-100",
    iconTextColor: "text-blue-700",
    brandColor: "bg-blue-600",
    brandHoverColor: "hover:bg-blue-700",
    requiredEnvVars: ["PAYCHEX_CLIENT_ID", "PAYCHEX_CLIENT_SECRET"],
    statusRoute: "paychex/status",
    setupSteps: [],
    features: ["Payroll processing", "Tax compliance", "HR administration"],
    comingSoon: true,
  },
];

export function getPluginBySlug(slug: string): PluginDefinition | undefined {
  return PLUGINS.find((p) => p.slug === slug);
}

export function getPluginsByCategory(category: PluginCategory): PluginDefinition[] {
  return PLUGINS.filter((p) => p.category === category);
}

export function getActivePlugins(): PluginDefinition[] {
  return PLUGINS.filter((p) => !p.comingSoon);
}

export function getComingSoonPlugins(): PluginDefinition[] {
  return PLUGINS.filter((p) => p.comingSoon);
}
