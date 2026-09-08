import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-955 text-slate-200 px-6 py-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 backdrop-blur-lg shadow-2xl">
        {/* Navigation Header */}
        <div className="border-b border-slate-850 pb-6">
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider block mb-2">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white">Privacy Policy & Platform Data Terms</h1>
          <p className="text-xs text-slate-400 mt-1">Effective Date: August 4, 2026 | Last Updated: September 8, 2026</p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">1. Overview & Multi-Platform Scope</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            <strong>OmniSync</strong> (accessible at <a href="https://omnisyncapp.com" className="text-indigo-400 hover:underline">https://omnisyncapp.com</a>) is an autonomous social media content scheduling and multi-channel publishing SaaS platform owned, developed, and operated by <strong>Avenar</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). 
            This Privacy Policy details how Avenar and OmniSync collect, process, encrypt, and safeguard your personal information and social media tokens when you link your accounts across <strong>LinkedIn</strong>, <strong>Instagram (Meta)</strong>, and <strong>X (Twitter)</strong>.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">2. Information We Collect</h2>
          <div className="text-xs leading-relaxed text-slate-300 space-y-2">
            <p>When you register and interact with OmniSync, we collect:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>User Account Profile:</strong> Your name, email address, password hash, and subscription plan tier.</li>
              <li><strong>Social OAuth Tokens:</strong> Encrypted OAuth 2.0 access tokens, refresh tokens, profile IDs, handle names, and expiration timestamps provided by linked platforms.</li>
              <li><strong>Content Campaigns & Media Assets:</strong> Content drafts, scheduled post texts, image/video URLs, and campaign target platform rules.</li>
              <li><strong>Telemetry & Usage Logs:</strong> IP address, request tracing headers, AI generation token usage, and publishing execution logs.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 - Platform Integrations */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-indigo-400">3. Social Platform Connections & API Usage</h2>
          
          {/* LinkedIn */}
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#0a66c2]/10 text-[#0a66c2] text-[10px] font-black uppercase">LinkedIn</span>
              <h3 className="text-xs font-bold text-slate-200">LinkedIn Community Management & REST API Integration</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When connecting your LinkedIn account via official OAuth 2.0, OmniSync requests only necessary permissions: <code className="text-indigo-300">openid</code>, <code className="text-indigo-300">profile</code>, <code className="text-indigo-300">w_member_social</code>, and (for organization administrators) <code className="text-indigo-300">w_organization_social</code> and <code className="text-indigo-300">r_organization_social</code>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              These permissions are used strictly to authenticate your identity and dispatch user-authored or scheduled posts directly to your authorized personal profile or company pages. We do not read private messages, scrape member connections, or share LinkedIn data with third parties.
            </p>
          </div>

          {/* Instagram / Meta */}
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#e1306c]/10 text-[#e1306c] text-[10px] font-black uppercase">Meta / Instagram</span>
              <h3 className="text-xs font-bold text-slate-200">Instagram Graph API Integration</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When connecting Instagram Business or Creator accounts via Facebook Login, we request scopes: <code className="text-indigo-300">instagram_basic</code>, <code className="text-indigo-300">instagram_content_publish</code>, and <code className="text-indigo-300">pages_show_list</code>. 
              Data is used exclusively to publish posts to your Instagram feed on your scheduled timetable.
            </p>
          </div>

          {/* X (Twitter) */}
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-black uppercase">X (Twitter)</span>
              <h3 className="text-xs font-bold text-slate-200">X API v2 Integration (OAuth 2.0 PKCE)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When linking your X account using OAuth 2.0 PKCE authentication, we request scopes: <code className="text-indigo-300">tweet.read</code>, <code className="text-indigo-300">tweet.write</code>, <code className="text-indigo-300">users.read</code>, and <code className="text-indigo-300">offline.access</code> solely to publish scheduled tweets on your behalf.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">4. Data Protection & AES-256-GCM Encryption</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            Security is fundamental to our architecture. All sensitive OAuth access tokens, refresh tokens, and internal context memory payloads are encrypted in our database using authenticated <strong>AES-256-GCM encryption</strong> before storage. We do not sell, rent, monetize, or share your linked account tokens or content data with any third-party advertisers or data brokers.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">5. Data Revocation & Account Deletion</h2>
          <div className="text-xs leading-relaxed text-slate-300 space-y-2">
            <p>You maintain complete ownership of your social channels and data:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
              <li><strong>Instant Channel Disconnection:</strong> Navigate to <em>Connected Accounts</em> in your console dashboard at any time to delete social tokens immediately.</li>
              <li><strong>Revoking App Permissions:</strong> You can revoke OmniSync permissions directly from your LinkedIn Authorized Apps, Instagram/Facebook Settings, or X Connected Apps settings.</li>
              <li><strong>Complete Account Deletion:</strong> Contact our Data Privacy Officer at <code className="text-indigo-300">support@omnisyncapp.com</code> or select <em>Settings &gt; Delete Account</em> to permanently wipe all stored account records, logs, and tokens from our systems.</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">6. Organization & Contact Information</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            OmniSync is operated by <strong>Avenar</strong>. For compliance inquiries, data deletion requests, or developer API audits regarding LinkedIn, Meta, or X integrations, please contact:
            <br />
            <strong>Parent Company:</strong> Avenar
            <br />
            <strong>Product Website:</strong> <a href="https://omnisyncapp.com" className="text-indigo-400 hover:underline">https://omnisyncapp.com</a>
            <br />
            <strong>Data Privacy & Support:</strong> <a href="mailto:support@omnisyncapp.com" className="text-indigo-400 hover:underline">support@omnisyncapp.com</a>
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-850 text-[10px] text-slate-500 flex justify-between items-center">
          <span>© 2026 Avenar. All rights reserved. OmniSync™ is an Avenar product.</span>
          <Link href="/" className="text-indigo-400 hover:underline font-bold">Return to App</Link>
        </footer>
      </div>
    </div>
  );
}
