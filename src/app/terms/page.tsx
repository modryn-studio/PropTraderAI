import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | PropTrader.AI',
  description: 'Terms of Service for PropTrader.AI - Trading automation platform.',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-[rgba(255,255,255,0.5)] mb-8">Last updated: January 12, 2026</p>

          {/* Agreement to Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">1. Agreement to Terms</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              By accessing or using PropTrader.AI (&quot;the Service&quot;), you agree to be bound by these 
              Terms of Service (&quot;Terms&quot;). If you disagree with any part of the terms, you may 
              not access the Service.
            </p>
            <p className="text-[rgba(255,255,255,0.85)]">
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          {/* Description of Service */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              PropTrader.AI is a trading automation platform that:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Converts natural language trading strategies into executable rules</li>
              <li>Monitors and tracks prop firm challenge compliance</li>
              <li>Analyzes behavioral patterns to prevent emotional trading errors</li>
              <li>Connects to supported brokers for trade execution</li>
              <li>Provides AI-powered trading assistance and analysis</li>
            </ul>
          </section>

          {/* Risk Disclaimer */}
          <section className="mb-8 p-4 bg-[rgba(181,50,61,0.1)] border border-[rgba(181,50,61,0.3)] rounded-lg">
            <h2 className="text-xl font-bold text-[#b5323d] mb-4">3. Risk Disclaimer</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4 font-semibold">
              TRADING FUTURES AND OPTIONS INVOLVES SUBSTANTIAL RISK OF LOSS AND IS NOT SUITABLE 
              FOR ALL INVESTORS.
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Past performance is not indicative of future results</li>
              <li>You may lose more than your initial investment</li>
              <li>Only trade with money you can afford to lose</li>
              <li>PropTrader.AI is a tool to assist with execution, not financial advice</li>
              <li>We do not guarantee profits or protection from losses</li>
              <li>You are solely responsible for your trading decisions</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              By using this Service, you acknowledge that you understand these risks and accept 
              full responsibility for your trading activities.
            </p>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">4. Eligibility</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              To use PropTrader.AI, you must:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from trading futures by any applicable law or regulation</li>
              <li>Have a valid account with a supported broker (e.g., Tradovate)</li>
              <li>Comply with all applicable laws in your jurisdiction</li>
            </ul>
          </section>

          {/* Account Responsibilities */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">5. Account Responsibilities</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              When you create an account with us, you must:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              You may not share your account with others or use another person&apos;s account.
            </p>
          </section>

          {/* Broker Connection */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">6. Broker Connection & Trade Execution</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              By connecting your broker account to PropTrader.AI:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>You authorize us to access your account data (positions, orders, history)</li>
              <li>You authorize us to place, modify, and cancel orders on your behalf</li>
              <li>You understand that execution depends on broker API availability</li>
              <li>You accept that technical issues may delay or prevent trade execution</li>
              <li>You acknowledge that you can revoke access at any time</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              PropTrader.AI is not responsible for broker downtime, API failures, or execution 
              issues outside our control.
            </p>
          </section>

          {/* Behavioral Analysis */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">7. Behavioral Analysis & Intervention</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              Our behavioral intelligence system may:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Analyze your trading patterns for signs of emotional trading</li>
              <li>Display warnings when patterns suggest potential self-sabotage</li>
              <li>Add friction (delays, confirmations) before high-risk trades</li>
              <li>In Autopilot mode, automatically pause trading under certain conditions</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              These interventions are advisory in Copilot mode. In Autopilot mode, you consent 
              to automatic intervention to protect your account from rule violations.
            </p>
          </section>

          {/* Prop Firm Compliance */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">8. Prop Firm Compliance</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              PropTrader.AI helps track compliance with prop firm rules. However:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>We do not guarantee you will pass any prop firm challenge</li>
              <li>Prop firm rules may change without notice; verify rules independently</li>
              <li>Our tracking is based on data available to us and may not be 100% accurate</li>
              <li>You are responsible for understanding and complying with your prop firm&apos;s rules</li>
              <li>Some prop firms may prohibit automated trading tools; verify with your firm</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">9. Intellectual Property</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              The Service and its original content, features, and functionality are owned by 
              PropTrader.AI and are protected by international copyright, trademark, and other 
              intellectual property laws.
            </p>
            <p className="text-[rgba(255,255,255,0.85)]">
              Your trading strategies remain your intellectual property. By using the Service, 
              you grant us a license to process and store your strategies for service operation.
            </p>
          </section>

          {/* Prohibited Uses */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">10. Prohibited Uses</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              You agree not to use the Service:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] space-y-2">
              <li>For any unlawful purpose or illegal trading activity</li>
              <li>To circumvent any prop firm rules through deceptive means</li>
              <li>To reverse engineer, decompile, or attempt to extract source code</li>
              <li>To interfere with or disrupt the Service or servers</li>
              <li>To impersonate others or provide false information</li>
              <li>To resell or redistribute the Service without authorization</li>
              <li>To automate market manipulation or abusive trading practices</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">11. Termination</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              We may terminate or suspend your account immediately, without prior notice, for:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>Breach of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>At our sole discretion, for any reason</li>
            </ul>
            <p className="text-[rgba(255,255,255,0.85)]">
              You may delete your account at any time through the Settings page. Upon deletion, 
              your personal data will be removed as described in our{' '}
              <Link href="/privacy" className="text-[#00FFD1] hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">12. Limitation of Liability</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul className="list-disc list-inside text-[rgba(255,255,255,0.85)] mb-4 space-y-2">
              <li>PropTrader.AI shall not be liable for any trading losses</li>
              <li>We are not liable for missed trades due to technical issues</li>
              <li>We are not liable for prop firm challenge failures</li>
              <li>Our total liability shall not exceed the amount you paid for the Service</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
            </ul>
          </section>

          {/* Disclaimer of Warranties */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">13. Disclaimer of Warranties</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT 
              THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">14. Indemnification</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              You agree to indemnify and hold harmless PropTrader.AI, its officers, directors, 
              employees, and agents from any claims, damages, or expenses arising from your use 
              of the Service, your violation of these Terms, or your violation of any rights of 
              a third party.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">15. Governing Law</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              These Terms shall be governed by and construed in accordance with the laws of the 
              State of Delaware, United States, without regard to its conflict of law provisions. 
              Any disputes shall be resolved in the courts of Delaware.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">16. Changes to Terms</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              We reserve the right to modify or replace these Terms at any time. Material changes 
              will be notified via email or prominent notice on the Service. Continued use after 
              changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">17. Severability</h2>
            <p className="text-[rgba(255,255,255,0.85)]">
              If any provision of these Terms is held to be invalid or unenforceable, the 
              remaining provisions will continue in full force and effect.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">18. Contact Us</h2>
            <p className="text-[rgba(255,255,255,0.85)] mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="text-[rgba(255,255,255,0.85)] space-y-2">
              <li>Email: <a href="mailto:legal@proptrader.ai" className="text-[#00FFD1] hover:underline">legal@proptrader.ai</a></li>
              <li>Support: <a href="mailto:support@proptrader.ai" className="text-[#00FFD1] hover:underline">support@proptrader.ai</a></li>
            </ul>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex gap-4 justify-center text-sm text-[rgba(255,255,255,0.5)]">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}
