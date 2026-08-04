import React from 'react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-955 text-slate-200 px-6 py-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 backdrop-blur-lg shadow-2xl">
        {/* Navigation Header */}
        <div className="border-b border-slate-850 pb-6">
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider block mb-2">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white">Terms of Service & Platform Usage Policy</h1>
          <p className="text-xs text-slate-400 mt-1">Effective Date: August 4, 2026</p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">1. Acceptance of Terms</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            By accessing or using <strong>OmniSync</strong> (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you are accepting these terms on behalf of a company or legal entity, you represent that you have the authority to bind such entity.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">2. Service Overview & Social Platform Integration</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            OmniSync provides automated AI content generation, post scheduling, and multi-channel publishing to third-party social media networks including <strong>Instagram (Meta)</strong>, <strong>LinkedIn</strong>, and <strong>X (Twitter)</strong>. You acknowledge that your use of third-party platforms via OmniSync is also subject to their respective terms and community guidelines.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">3. User Responsibilities & Acceptable Content</h2>
          <div className="text-xs leading-relaxed text-slate-300 space-y-2">
            <p>You agree NOT to use Social Autopilot to generate, schedule, or publish:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li>Spam, automated abuse, or repetitive low-quality marketing blasts violating social network policies.</li>
              <li>Hate speech, harassment, defamatory, or illegal content.</li>
              <li>Copyrighted or trademarked material without authorization.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">4. Third-Party Platform Compliance</h2>
          <div className="text-xs leading-relaxed text-slate-300 space-y-2">
            <p>Your authorization granted to Social Autopilot adheres to third-party developer policies:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Meta (Facebook & Instagram):</strong> Usage complies with Meta Platform Terms and Instagram Graph API policies.</li>
              <li><strong>LinkedIn:</strong> Usage complies with LinkedIn API Terms and Developer Agreement.</li>
              <li><strong>X (Twitter):</strong> Usage complies with X API Developer Agreement and Developer Policy.</li>
            </ul>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">5. Limitation of Liability & Service Availability</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            Social Autopilot strives for 99.9% queue and worker uptime. However, we are not liable for temporary service interruptions, third-party API rate limits, or account suspensions imposed directly by Instagram, LinkedIn, or X.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">6. Account Termination & Contact</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            You may disconnect your social media accounts or delete your Social Autopilot account at any time. For legal or support inquiries, contact us at <code className="text-indigo-300">legal@socialautopilot.com</code>.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-850 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 Social Autopilot. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
