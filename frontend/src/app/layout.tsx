import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import StoreProvider from '@/store/StoreProvider';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { ToastContainer } from '@/components/Toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Social Autopilot Dashboard',
  description: 'Enterprise Social Media Posting Scheduler & AI Content Generator',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100" suppressHydrationWarning>
        <GlobalErrorBoundary>
          <StoreProvider>
            <ToastContainer />
            <AppLayout>{children}</AppLayout>
          </StoreProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
