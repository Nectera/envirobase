import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — EnviroBase",
  description: "EnviroBase terms of service — the agreement governing use of the platform.",
};

const ENTITY = "Nectera Holdings LLC";
const CONTACT_EMAIL = "cody@necteraholdings.com";
const EFFECTIVE_DATE = "March 19, 2026";
const JURISDICTION = "Colorado";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Header */}
      <header className="border-b border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
            &larr; Back to EnviroBase
          </Link>
          <Link href="/privacy" className="text-slate-500 hover:text-slate-400 text-sm">
            Privacy Policy
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Effective date: {EFFECTIVE_DATE}</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you
              and {ENTITY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) governing your use of the
              EnviroBase platform (the &quot;Service&quot;). By creating an account, accessing, or using the
              Service, you agree to be bound by these Terms. If you are using the Service on behalf of an
              organization, you represent that you have authority to bind that organization to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              EnviroBase is a cloud-based, multi-tenant software-as-a-service platform designed for
              environmental services companies. The Service provides tools for customer relationship
              management, project management, scheduling, compliance tracking, team communication, and
              business operations. Features available to your organization depend on your subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account Registration</h2>
            <p>
              To use the Service, you must create an account with accurate and complete information. You are
              responsible for maintaining the confidentiality of your account credentials and for all activities
              that occur under your account. You must notify us immediately of any unauthorized use. We reserve
              the right to suspend or terminate accounts that violate these Terms or that contain false
              registration information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Subscription Plans and Payment</h2>
            <p className="mb-2">
              The Service is offered under tiered subscription plans (Starter, Pro, and Enterprise), each with
              different features, user limits, and pricing as described on our website. Prices are subject to
              change with 30 days&apos; notice.
            </p>
            <p className="mb-2">
              Subscriptions are billed monthly or annually in advance. All fees are non-refundable except as
              required by law or as expressly stated in these Terms. If payment fails, we may suspend access
              to the Service until the balance is resolved.
            </p>
            <p>
              You may upgrade, downgrade, or cancel your subscription at any time. Downgrades or cancellations
              take effect at the end of the current billing period. Upon cancellation, your data will be
              retained for 90 days, after which it will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Your Data</h2>
            <p className="mb-2">
              You retain all ownership rights to the data you input into the Service (&quot;Your Data&quot;).
              We do not claim ownership of Your Data. You grant us a limited license to host, store, process,
              and display Your Data solely for the purpose of providing and improving the Service.
            </p>
            <p>
              You are responsible for the accuracy, legality, and appropriateness of Your Data. You must not
              upload content that infringes on third-party intellectual property rights, contains malware, or
              violates any applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <p>
              Use the Service for any unlawful purpose or in violation of any applicable law or regulation;
              attempt to gain unauthorized access to the Service, other accounts, or related systems;
              interfere with or disrupt the Service or servers or networks connected to the Service;
              reverse engineer, decompile, or disassemble any part of the Service;
              use the Service to store or transmit malicious code or harmful content;
              resell, sublicense, or redistribute the Service without our prior written consent;
              use automated means (bots, scrapers) to access or collect data from the Service except through
              approved APIs; or impersonate any person or entity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p>
              The Service, including its design, code, features, documentation, and branding, is owned by
              {" "}{ENTITY} and is protected by intellectual property laws. These Terms do not grant you any
              rights to our trademarks, logos, or brand features. Organizations using the white-label
              capabilities of the Service may apply their own branding but do not acquire any intellectual
              property rights in the underlying platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. AI Features</h2>
            <p>
              The Service may include features powered by artificial intelligence, including AI scheduling
              assistance, AI knowledge base, and AI-generated content. AI-generated outputs are provided
              for informational purposes and should be reviewed before reliance. We do not guarantee the
              accuracy, completeness, or suitability of AI-generated content. You are responsible for
              reviewing and validating AI outputs before taking action based on them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted access to the Service.
              The Service may be temporarily unavailable due to maintenance, updates, or factors beyond our
              control. We will make reasonable efforts to provide advance notice of planned maintenance. We are
              not liable for any loss or damage resulting from Service downtime.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Limitation of Liability</h2>
            <p className="mb-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {ENTITY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
              REVENUE, DATA, OR USE, WHETHER IN AN ACTION IN CONTRACT, TORT, OR OTHERWISE, ARISING OUT OF
              OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
            <p>
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE
              SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
              ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT
              THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED. YOUR USE OF THE SERVICE IS AT
              YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless {ENTITY}, its officers, directors, employees,
              and agents from any claims, damages, losses, liabilities, and expenses (including reasonable
              attorneys&apos; fees) arising out of or related to your use of the Service, your violation of
              these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">13. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time for cause, including
              violation of these Terms, non-payment, or conduct that we reasonably believe is harmful to
              other users or our business. Upon termination, your right to use the Service ceases immediately.
              Sections relating to intellectual property, limitation of liability, indemnification, and
              governing law survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">14. Governing Law and Disputes</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of
              {" "}{JURISDICTION}, United States, without regard to its conflict of law principles. Any
              dispute arising out of or relating to these Terms or the Service shall be resolved exclusively
              in the state or federal courts located in {JURISDICTION}, and you consent to personal
              jurisdiction in such courts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">15. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material changes
              by posting the updated Terms on this page and updating the effective date. For significant
              changes, we may also notify you by email. Your continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">16. General Provisions</h2>
            <p>
              If any provision of these Terms is found unenforceable, the remaining provisions will continue
              in effect. Our failure to enforce any right or provision does not constitute a waiver. These
              Terms, together with the Privacy Policy, constitute the entire agreement between you and
              {" "}{ENTITY} regarding the Service and supersede all prior agreements.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">17. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
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
            <Link href="/privacy" className="text-xs text-slate-600 hover:text-slate-400">Privacy Policy</Link>
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
