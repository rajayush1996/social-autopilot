import React from 'react';
import Link from 'next/link';

export default function DataDeletionInstructions() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 md:p-12 backdrop-blur-lg shadow-2xl">
        {/* Navigation Header */}
        <div className="border-b border-slate-800 pb-6">
          <Link href="/" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider block mb-2">
            ← Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-white">User Data Deletion Instructions</h1>
          <p className="text-xs text-slate-400 mt-1">Platform Compliance & Data Privacy Guidelines</p>
        </div>

        {/* Overview */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">1. Commitment to User Privacy & Control</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            <strong>OmniSync</strong> (operated by <strong>Avenar</strong>) respects your personal data and privacy. 
            In compliance with Meta Platform Terms, GDPR, and international privacy standards, we provide straightforward mechanisms 
            for users to request the permanent deletion of their account data, OAuth tokens, and social media records.
          </p>
        </section>

        {/* Step-by-Step Instructions */}
        <section className="space-y-4">
          <h2 className="text-base font-bold text-indigo-400">2. How to Delete Your Data from OmniSync</h2>

          <div className="space-y-3">
            {/* Method A: Disconnect Social Accounts */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-black">1</span>
                Instant Social Account Disconnection (OAuth Token Removal)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you only wish to remove your linked social accounts (Instagram, Facebook, LinkedIn, X):
              </p>
              <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1">
                <li>Log in to your OmniSync account at <a href="https://omnisyncapp.com" className="text-indigo-400 hover:underline">https://omnisyncapp.com</a>.</li>
                <li>Navigate to <strong>Connected Accounts</strong> in the dashboard sidebar.</li>
                <li>Click the <strong>&quot;Disconnect&quot;</strong> button next to any linked social channel.</li>
                <li>All stored access tokens, refresh tokens, and linked identifiers will be permanently deleted from our database immediately.</li>
              </ol>
            </div>

            {/* Method B: Revoke Access via Meta */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-black">2</span>
                Revoke App Permissions from Facebook / Meta
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You can revoke OmniSync&apos;s permissions directly from your Meta / Facebook account:
              </p>
              <ol className="list-decimal pl-5 text-xs text-slate-400 space-y-1">
                <li>Go to your Facebook Profile <strong>Settings &amp; Privacy &gt; Settings</strong>.</li>
                <li>In the left menu, select <strong>Apps and Websites</strong>.</li>
                <li>Locate <strong>OmniSync</strong> (or <strong>social-copilot</strong>) and click <strong>Remove</strong>.</li>
                <li>Facebook will immediately invalidate all permissions and access tokens granted to OmniSync.</li>
              </ol>
            </div>

            {/* Method C: Complete Account Deletion */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-black">3</span>
                Complete Account &amp; Data Wipeout Request
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To completely wipe all user records, campaign histories, post drafts, email logs, and account profiles:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
                <li>Send an email to our Data Protection Team at <a href="mailto:support@omnisyncapp.com" className="text-indigo-400 hover:underline font-bold">support@omnisyncapp.com</a> with the subject line <strong>&quot;Data Deletion Request&quot;</strong>.</li>
                <li>Include your registered email address and user account name.</li>
                <li>Our team will process your request and permanently purge all associated database records within <strong>48 hours</strong>, confirming completion via email.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Data Retention Policy */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">3. Data Retention &amp; Security Policy</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            OmniSync does not retain cached copies of your social media posts or media assets once your account is deleted. 
            All stored credentials and OAuth tokens are protected with AES-256-GCM authenticated encryption while active, 
            and are irreversibly purged upon deletion.
          </p>
        </section>

        {/* Organization Contact Information */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-indigo-400">4. Contact Information</h2>
          <p className="text-xs leading-relaxed text-slate-300">
            For questions regarding this policy or any privacy matters:
            <br />
            <strong>Company:</strong> Avenar (OmniSync)
            <br />
            <strong>Official Website:</strong> <a href="https://omnisyncapp.com" className="text-indigo-400 hover:underline">https://omnisyncapp.com</a>
            <br />
            <strong>Support &amp; Compliance Email:</strong> <a href="mailto:support@omnisyncapp.com" className="text-indigo-400 hover:underline">support@omnisyncapp.com</a>
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} Avenar. All rights reserved. OmniSync&trade; is an Avenar product.</span>
          <Link href="/" className="text-indigo-400 hover:underline font-bold">Return to App</Link>
        </footer>
      </div>
    </div>
  );
}
