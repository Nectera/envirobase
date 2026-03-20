import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — EnviroBase",
  description: "EnviroBase privacy policy — how we collect, use, and protect your data.",
};

const ENTITY = "Nectera Holdings LLC";
const CONTACT_EMAIL = "cody@necteraholdings.com";
const EFFECTIVE_DATE = "March 19, 2026";
const JURISDICTION = "Colorado";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Header */}
      <header className="border-b border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
            &larr; Back to EnviroBase
          </Link>
          <Link href="/terms" className="text-slate-500 hover:text-slate-400 text-sm">
            Terms of Service
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              {ENTITY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the EnviroBase platform
              (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our Service. By accessing or using the Service, you
              agree to this Privacy Policy. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect information in the following ways:</p>
            <p className="mb-2">
              <strong className="text-white">Account Information.</strong> When you register for an account, we
              collect your name, email address, company name, phone number, and billing information. If your
              organization administrator creates an account on your behalf, they provide this information for you.
            </p>
            <p className="mb-2">
              <strong className="text-white">Usage Data.</strong> We automatically collect information about how
              you interact with the Service, including pages visited, features used, timestamps, IP addresses,
              browser type, and device information.
            </p>
            <p className="mb-2">
              <strong className="text-white">Business Data.</strong> You may input business data into the Service,
              including project information, client records, employee records, scheduling data, compliance
              documentation, and financial records. This data belongs to your organization.
            </p>
            <p>
              <strong className="text-white">Cookies and Tracking.</strong> We use cookies and similar
              technologies to maintain sessions, remember preferences, and improve the Service. We use Sentry
              for error tracking and performance monitoring, which may collect technical data about errors and
              page load performance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <p>
              Provide, maintain, and improve the Service; process transactions and send related information
              including confirmations and invoices; send transactional emails such as password resets, welcome
              emails, and notification alerts; respond to your comments, questions, and support requests;
              monitor and analyze usage trends to improve user experience; detect, prevent, and address
              technical issues, fraud, or security breaches; and comply with legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal information. We may share information with:</p>
            <p className="mb-2">
              <strong className="text-white">Service Providers.</strong> Third-party vendors who perform services
              on our behalf, such as hosting (Vercel), database services (Supabase), email delivery (Resend),
              error tracking (Sentry), AI processing (Anthropic), and payment processing (Stripe). These
              providers are contractually obligated to protect your information.
            </p>
            <p className="mb-2">
              <strong className="text-white">Your Organization.</strong> If you use the Service through an
              organization account, the organization administrator may access your account information and
              usage data within the Service.
            </p>
            <p>
              <strong className="text-white">Legal Requirements.</strong> We may disclose information if required
              by law, regulation, legal process, or governmental request, or to protect the rights, property,
              or safety of {ENTITY}, our users, or others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Multi-Tenant Data Isolation</h2>
            <p>
              EnviroBase is a multi-tenant platform. Each organization&apos;s data is logically isolated by
              organization identifiers at the database level. Your organization&apos;s business data is not
              accessible to other organizations. Organization administrators control user access, roles, and
              permissions within their tenant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including
              encryption in transit (TLS/HTTPS), hashed passwords (bcrypt), secure session management via
              JSON Web Tokens, role-based access controls, security headers (CSP, HSTS, X-Frame-Options),
              and rate limiting on authentication endpoints. However, no method of electronic storage or
              transmission is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the
              Service. When an organization cancels its subscription, we retain data for up to 90 days to
              allow for reactivation, after which it is permanently deleted. You may request earlier deletion
              by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Your Rights</h2>
            <p>
              Depending on your jurisdiction, you may have rights regarding your personal information,
              including the right to access, correct, or delete your data; the right to restrict or object
              to processing; the right to data portability; and the right to withdraw consent. Organization
              administrators may export their organization&apos;s data at any time through the Data Management
              settings. To exercise your individual rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:text-emerald-300">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed to individuals under the age of 16. We do not knowingly collect
              personal information from children. If we become aware that we have collected personal
              information from a child, we will take steps to delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              posting the new policy on this page and updating the effective date. For significant changes, we
              may also notify you by email. Your continued use of the Service after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:text-emerald-300">
                {CONTACT_EMAIL}
              </a>.
            </p>
            <p className="mt-3">
              {ENTITY}<br />
              {JURISDICTION}, United States
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} {ENTITY}
          </span>
          <div className="flex gap-4">
            <Link href="/terms" className="text-xs text-slate-600 hover:text-slate-400">Terms of Service</Link>
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
