'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Sun, Moon, Lock, Database, RefreshCw, Mail } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useTheme } from '@/context/ThemeContext';

export default function PrivacyPolicy() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-card)]/90 backdrop-blur-2xl border-b border-[var(--border-color)] px-6 md:px-12 py-3.5 flex items-center justify-between transition-colors shadow-xs">
        <div className="flex items-center gap-4">
          <BrandLogo href="/" size="md" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle Light and Dark Theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="h-9 w-9 rounded-xl bg-[var(--bg-input)] hover:bg-[#2563EB]/10 border border-[var(--border-color)] text-[var(--text-primary)] transition-all active:scale-95 shadow-xs cursor-pointer flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-[#2563EB]" />
            )}
          </button>

          <Link
            href="/"
            className="h-9 px-4 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to App</span>
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl md:rounded-3xl p-8 md:p-12 shadow-xl space-y-10">
          
          {/* Header Badge & Title */}
          <div className="border-b border-[var(--border-color)] pb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#2563EB] dark:text-[#60a5fa] text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Security &amp; Privacy Compliance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              Privacy Policy &amp; Platform Data Terms
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Effective Date: August 4, 2026 &bull; Last Updated: September 9, 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">1</span>
              Overview &amp; Multi-Platform Scope
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              <strong>OmniSync</strong> (accessible at{' '}
              <a href="https://omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] font-semibold hover:underline">
                https://omnisyncapp.com
              </a>
              ) is an autonomous social media content scheduling and multi-channel publishing SaaS platform owned, developed, and operated by{' '}
              <strong>Avenar</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). 
              This Privacy Policy details how Avenar and OmniSync collect, process, encrypt, and safeguard your personal information and social media tokens when you link your accounts across{' '}
              <strong>Meta (Instagram &amp; Facebook)</strong>, <strong>LinkedIn</strong>, and <strong>X (Twitter)</strong>.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">2</span>
              Information We Collect
            </h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)] space-y-3">
              <p>When you register and interact with OmniSync, we collect only necessary data to operate the service:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-[#2563EB]" />
                    User Account Profile
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Your name, email address, encrypted password hash, and subscription plan tier.</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-500" />
                    Encrypted OAuth Tokens
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Encrypted OAuth 2.0 access and refresh tokens used solely to dispatch posts to your profiles.</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-sky-500" />
                    Campaigns &amp; Media
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Post drafts, scheduled captions, image/video URLs, and target social channel rules.</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                    Publishing Telemetry
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Execution timestamps, status codes, and error delivery logs for audit tracking.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 - Platform Integrations */}
          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">3</span>
              Social Platform Connections &amp; API Usage
            </h2>
            
            {/* Meta / Instagram */}
            <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#e1306c]/10 text-[#e1306c] text-[11px] font-black uppercase">
                  Meta &bull; Instagram &amp; Facebook
                </span>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">Instagram &amp; Facebook Graph API Integration</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                When connecting your Instagram Professional or Facebook Page via Facebook Login, OmniSync requests only necessary permissions:{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">instagram_basic</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">instagram_content_publish</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">pages_show_list</code>, and{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">pages_manage_posts</code>.
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                These permissions are strictly used to schedule and publish single photos, carousels, and Reels to your authorized profiles. We never read private messages, scrap personal friends/followers lists, or sell Meta data to third parties.
              </p>
            </div>

            {/* LinkedIn */}
            <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#0a66c2]/10 text-[#0a66c2] text-[11px] font-black uppercase">
                  LinkedIn
                </span>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">LinkedIn REST &amp; Community Management API</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                When linking LinkedIn via official OAuth 2.0, OmniSync requests permissions:{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">openid</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">profile</code>, and{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">w_member_social</code>.
                Data is utilized exclusively to dispatch author-approved posts to your profile or organization page.
              </p>
            </div>

            {/* X (Twitter) */}
            <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-primary)] text-[11px] font-black uppercase">
                  X (Twitter)
                </span>
                <h3 className="text-xs font-bold text-[var(--text-primary)]">X API v2 Integration (OAuth 2.0 PKCE)</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                When linking X with PKCE authentication, scopes requested are:{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">tweet.read</code>,{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">tweet.write</code>, and{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[#2563EB] dark:text-[#60a5fa] font-mono text-[11px]">offline.access</code> solely to publish scheduled tweets on your behalf.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">4</span>
              Data Protection &amp; AES-256-GCM Encryption
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Security is fundamental to our architecture. All sensitive OAuth access tokens, refresh tokens, and internal context payloads are encrypted in our database using authenticated{' '}
              <strong className="text-[var(--text-primary)]">AES-256-GCM encryption</strong> before storage. 
              We do not sell, rent, monetize, or share your linked account credentials with third-party advertisers or brokers.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">5</span>
              Data Revocation &amp; User Data Deletion
            </h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)] space-y-2">
              <p>You maintain full control and ownership of your accounts and data:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li>
                  <strong className="text-[var(--text-primary)]">1-Click Disconnection:</strong> You can disconnect any social account from the <em>Connected Accounts</em> page at any time to instantly delete its stored tokens.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Revoke via Provider:</strong> You can revoke permissions directly from your Facebook / Instagram Settings, LinkedIn Authorized Apps, or X Connected Apps.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Complete Data Wipeout:</strong> For full account deletion instructions, visit our dedicated{' '}
                  <Link href="/data-deletion" className="text-[#2563EB] dark:text-[#60a5fa] font-bold hover:underline">
                    Data Deletion Instructions Page
                  </Link>{' '}
                  or email <a href="mailto:support@omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] font-semibold hover:underline">support@omnisyncapp.com</a>.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">6</span>
              Contact &amp; Organization Information
            </h2>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
              <p><strong className="text-[var(--text-primary)]">Operating Entity:</strong> Avenar (OmniSync)</p>
              <p><strong className="text-[var(--text-primary)]">Official Website:</strong> <a href="https://omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">https://omnisyncapp.com</a></p>
              <p><strong className="text-[var(--text-primary)]">Data Privacy Officer:</strong> <a href="mailto:support@omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">support@omnisyncapp.com</a></p>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Avenar. All rights reserved. OmniSync&trade; is an Avenar product.</span>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link>
              <span>&bull;</span>
              <Link href="/data-deletion" className="hover:text-[#2563EB] transition-colors">Data Deletion</Link>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
}
