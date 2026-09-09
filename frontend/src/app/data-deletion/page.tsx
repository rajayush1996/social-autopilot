'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Sun, Moon, Unlink, ShieldOff, Mail } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useTheme } from '@/context/ThemeContext';

export default function DataDeletionInstructions() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Trash2 className="h-3.5 w-3.5" />
              <span>User Data Rights &amp; Deletion</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">
              User Data Deletion Instructions
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Meta Platform Compliance &bull; Last Updated: September 9, 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">1</span>
              Commitment to User Privacy &amp; Control
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              <strong>OmniSync</strong> (operated by <strong>Avenar</strong>) respects your personal data and privacy. 
              In strict compliance with Meta Platform Terms, GDPR, and international data protection standards, we provide transparent mechanisms 
              for users to revoke permissions and request the permanent deletion of their account data, OAuth tokens, and social media records.
            </p>
          </section>

          {/* Section 2 - Step-by-Step Instructions */}
          <section className="space-y-4">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">2</span>
              How to Delete Your Data from OmniSync
            </h2>

            <div className="space-y-4 pt-1">
              {/* Option A: Disconnect Social Accounts */}
              <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] flex items-center justify-center">
                    <Unlink className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Option 1: Instant Social Account Disconnection</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  If you wish to remove your linked social accounts (Instagram, Facebook, LinkedIn, or X):
                </p>
                <ol className="list-decimal pl-5 text-xs text-[var(--text-secondary)] space-y-1">
                  <li>Log in to your OmniSync account at <a href="https://omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] font-semibold hover:underline">https://omnisyncapp.com</a>.</li>
                  <li>Navigate to <strong>Connected Accounts</strong> in the dashboard sidebar.</li>
                  <li>Click the <strong>&quot;Disconnect&quot;</strong> button next to any linked social channel.</li>
                  <li>All stored access tokens, refresh tokens, and linked profile identifiers are permanently erased from our database immediately.</li>
                </ol>
              </div>

              {/* Option B: Revoke via Meta */}
              <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#e1306c]/10 text-[#e1306c] flex items-center justify-center">
                    <ShieldOff className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Option 2: Revoke Permissions via Facebook Settings</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  You can revoke OmniSync&apos;s authorization directly from your Meta / Facebook account:
                </p>
                <ol className="list-decimal pl-5 text-xs text-[var(--text-secondary)] space-y-1">
                  <li>Open your Facebook Profile <strong>Settings &amp; Privacy &gt; Settings</strong>.</li>
                  <li>In the left menu, select <strong>Apps and Websites</strong>.</li>
                  <li>Locate <strong>OmniSync</strong> (or <strong>social-copilot</strong>) and click <strong>Remove</strong>.</li>
                  <li>Facebook will immediately invalidate all permissions and access tokens previously granted to OmniSync.</li>
                </ol>
              </div>

              {/* Option C: Complete Account & Data Wipeout */}
              <div className="p-5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Option 3: Complete Account &amp; Data Wipeout</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  To permanently delete all user records, campaign histories, post drafts, email logs, and account profiles:
                </p>
                <ul className="list-disc pl-5 text-xs text-[var(--text-secondary)] space-y-1">
                  <li>Send an email to our Data Protection Team at <a href="mailto:support@omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] font-bold hover:underline">support@omnisyncapp.com</a> with the subject line <strong>&quot;Data Deletion Request&quot;</strong>.</li>
                  <li>Include your registered OmniSync email address and full name.</li>
                  <li>Our compliance team will permanently purge all associated records within <strong>48 hours</strong> and email you a confirmation notice.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 - Data Retention */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">3</span>
              Data Retention &amp; Security Policy
            </h2>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              OmniSync does not retain cached copies of your social media posts or media assets once your account is deleted. 
              All stored credentials and OAuth tokens are protected with AES-256-GCM authenticated encryption while active, 
              and are irreversibly purged upon deletion.
            </p>
          </section>

          {/* Section 4 - Contact */}
          <section className="space-y-3">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60a5fa] text-xs font-black flex items-center justify-center">4</span>
              Contact Information
            </h2>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
              <p><strong className="text-[var(--text-primary)]">Company:</strong> Avenar (OmniSync)</p>
              <p><strong className="text-[var(--text-primary)]">Official Website:</strong> <a href="https://omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">https://omnisyncapp.com</a></p>
              <p><strong className="text-[var(--text-primary)]">Data Privacy &amp; Support:</strong> <a href="mailto:support@omnisyncapp.com" className="text-[#2563EB] dark:text-[#60a5fa] hover:underline font-semibold">support@omnisyncapp.com</a></p>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-6 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row justify-between items-center gap-3">
            <span>&copy; {new Date().getFullYear()} Avenar. All rights reserved. OmniSync&trade; is an Avenar product.</span>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/privacy" className="hover:text-[#2563EB] transition-colors">Privacy Policy</Link>
              <span>&bull;</span>
              <Link href="/terms" className="hover:text-[#2563EB] transition-colors">Terms of Service</Link>
            </div>
          </footer>

        </div>
      </main>
    </div>
  );
}
