import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | PropTrader.AI',
  description: 'Privacy policy for PropTrader.AI - How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#000000] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.5)] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="card">
          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-[rgba(255,255,255,0.5)] mb-8">Last updated: January 12, 2026</p>

          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              PropTrader.AI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our trading automation platform.
            </p>
            <p className="text-[rgba(255,255,255,0.85)]">
              By using PropTrader.AI, you agree to the collection and use of information in 
              accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Email address (for authentication)</li>
              <li>Profile information you provide</li>
              <li>Broker connection credentials (encrypted)</li>
              <li>Conversation history with our AI</li>
              <li>Screenshots you upload for analysis</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2">Trading Data</h3>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Trade history synced from your broker</li>
              <li>Strategy configurations and rules</li>
              <li>Challenge progress and compliance data</li>
              <li>Behavioral patterns (timing, sizing, session data)</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mb-2">Automatically Collected</h3>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Device information and browser type</li>
              <li>IP address and approximate location</li>
              <li>Usage patterns and feature interactions</li>
              <li>Session timing and duration</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>To provide and maintain our trading automation service</li>
              <li>To execute trades on your behalf based on your strategies</li>
              <li>To detect behavioral patterns and prevent trading errors</li>
              <li>To track your challenge progress and compliance</li>
              <li>To improve our AI models and trading algorithms</li>
              <li>To send important service notifications</li>
              <li>To respond to your inquiries and support requests</li>
            </ul>
          </section>

          {/* Behavioral Intelligence */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">4. Behavioral Intelligence</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              A core feature of PropTrader.AI is our behavioral intelligence system, which analyzes 
              your trading patterns to help prevent emotional trading mistakes and protect your 
              challenge accounts.
            </p>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              This includes analysis of:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Trading session timing and duration</li>
              <li>Position sizing patterns</li>
              <li>Win/loss sequences and emotional responses</li>
              <li>Deviation from stated strategy rules</li>
              <li>Risk-taking behavior near daily limits</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              This behavioral data is used to provide real-time protection and is retained in 
              anonymized form to improve our AI models (see Section 7).
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">5. Data Security</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>All data encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>Broker credentials stored with additional encryption</li>
              <li>Row-level security ensuring you can only access your own data</li>
              <li>Regular security audits and penetration testing</li>
              <li>SOC 2 compliant infrastructure (Supabase, Vercel)</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Third-Party Services</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li><strong>Supabase:</strong> Database and authentication</li>
              <li><strong>Anthropic (Claude):</strong> AI strategy parsing and analysis</li>
              <li><strong>Tradovate:</strong> Broker integration for trade execution</li>
              <li><strong>Vercel:</strong> Application hosting</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)] mt-4">
              Each service has its own privacy policy. We do not sell your personal data to 
              any third party.
            </p>
          </section>

          {/* Data Retention After Account Deletion */}
          <section className="mb-8 p-4 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">7. Data Retention After Account Deletion</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              When you delete your account, we <strong>immediately and permanently delete</strong> all 
              personally identifiable information including:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Your email address and profile</li>
              <li>Broker connection credentials and API tokens</li>
              <li>Conversation history and chat messages</li>
              <li>Uploaded screenshots and analyses</li>
              <li>Your authentication records</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              We retain <strong>anonymized trading patterns and behavioral data</strong> for 
              research and product improvement. This anonymized data:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Cannot be used to identify you personally</li>
              <li>Has no connection to your email or profile</li>
              <li>Is stored with NULL user identifiers (no user ID linked)</li>
              <li>Helps us improve our AI models for all users</li>
              <li>Contains only aggregated trading patterns, not personal details</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              <strong>You may re-register at any time</strong> with the same email address. 
              Your new account will be completely separate from any previously anonymized data.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">8. Your Rights</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Delete your account and personal data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)] mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@proptrader.ai" className="text-[#00FFD1] hover:underline">
                privacy@proptrader.ai
              </a>
            </p>
          </section>

          {/* GDPR Compliance */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">9. GDPR Compliance (EEA Users)</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              For users in the European Economic Area, we process data under these legal bases:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li><strong>Contract:</strong> Necessary to provide our trading automation service</li>
              <li><strong>Legitimate Interest:</strong> Improving our AI and preventing fraud</li>
              <li><strong>Consent:</strong> For optional features and marketing communications</li>
            </ul>
          </section>

          {/* CCPA Compliance */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">10. CCPA Compliance (California Users)</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              California residents have additional rights under CCPA:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know if personal information is sold or disclosed</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising CCPA rights</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)] mt-4">
              <strong>We do not sell your personal information.</strong>
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">11. Children&apos;s Privacy</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              PropTrader.AI is not intended for users under 18 years of age. We do not knowingly 
              collect personal information from children. If you believe a child has provided us 
              with personal information, please contact us immediately.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">12. Changes to This Policy</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by posting the new policy on this page and updating the 
              &quot;Last updated&quot; date. Continued use of PropTrader.AI after changes constitutes 
              acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">13. Contact Us</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <ul className="text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Email: <a href="mailto:privacy@proptrader.ai" className="text-[#00FFD1] hover:underline">privacy@proptrader.ai</a></li>
              <li>Support: <a href="mailto:support@proptrader.ai" className="text-[#00FFD1] hover:underline">support@proptrader.ai</a></li>
            </ul>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex gap-4 justify-center text-sm text-[rgba(255,255,255,0.5)]">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
