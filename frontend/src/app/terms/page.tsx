'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Sun, Moon, CheckCircle2, ShieldAlert } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useTheme } from '@/context/ThemeContext';

export default function TermsOfService() {
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
              <FileText className="h-3.5 w-3.5" />
              <span>Platform Usage Terms</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              Terms of Service &amp; Usage Policy
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Effective Date: August 4, 2026 &bull; Last Updated: September 9, 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">1</span>
              Acceptance of Terms
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              By accessing or using <strong>OmniSync</strong> (&quot;the Platform&quot;), a SaaS service developed and operated by <strong>Avenar</strong> (&quot;the Company&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service. If you are accepting these terms on behalf of an agency, company, or business entity, you represent that you possess the necessary authorization to bind such entity.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">2</span>
              Service Overview &amp; Social Platform Integration
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              OmniSync provides autonomous AI content generation, multi-account post scheduling, and publishing to third-party social media networks including <strong>Meta (Instagram &amp; Facebook)</strong>, <strong>LinkedIn</strong>, and <strong>X (Twitter)</strong>. Your usage of these connected networks is strictly governed by their respective platform policies and terms of service.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">3</span>
              Acceptable Use Policy &amp; Content Guidelines
            </h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)] space-y-2">
              <p>You agree not to use OmniSync to generate, schedule, or distribute:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li>Spam, automated abuse, or low-quality repetitive bulk marketing posts violating social networks&apos; community standards.</li>
                <li>Harassment, defamatory, hateful, fraudulent, or unlawful materials.</li>
                <li>Copyrighted or trademarked assets without appropriate commercial rights or author consent.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">4</span>
              Third-Party Developer Policy Compliance
            </h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)] space-y-2">
              <p>OmniSync strictly adheres to official developer guidelines across all supported channels:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">Meta Platform Terms</div>
                  <p className="text-xs text-[var(--text-secondary)]">Compliance with Instagram Graph API &amp; Facebook Platform Terms.</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">LinkedIn API Terms</div>
                  <p className="text-xs text-[var(--text-secondary)]">Compliance with LinkedIn Community Management &amp; Developer Agreement.</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] space-y-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">X Developer Policy</div>
                  <p className="text-xs text-[var(--text-secondary)]">Compliance with X API v2 Rules and automation policies.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">5</span>
              Limitation of Liability &amp; Warranties
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              OmniSync and Avenar provide the platform &quot;as is&quot; without warranties of uninterrupted uptime. We are not liable for actions taken by third-party social media networks (such as rate limits, account restrictions, or API modifications) or indirect commercial losses resulting from scheduled campaigns.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">6</span>
              Contact Information
            </h2>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
              <p><strong className="text-[var(--text-primary)]">Parent Company:</strong> Avenar (OmniSync)</p>
              <p><strong className="text-[var(--text-primary)]">Official Website:</strong> <a href="https://omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">https://omnisyncapp.com</a></p>
              <p><strong className="text-[var(--text-primary)]">Legal &amp; Support Inquiries:</strong> <a href="mailto:support@omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">support@omnisyncapp.com</a></p>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Avenar. All rights reserved. OmniSync&trade; is an Avenar product.</span>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/privacy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link>
              <span>&bull;</span>
              <Link href="/data-deletion" className="hover:text-[#2563EB] transition-colors">Data Deletion</Link>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
}
