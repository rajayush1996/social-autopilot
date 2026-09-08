import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import StoreProvider from '@/store/StoreProvider';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import { ToastContainer } from '@/components/Toast';
import ConsoleGuard from '@/components/ConsoleGuard';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://omnisyncapp.com'),
  title: 'OmniSync - Autonomous Social Media AI Autopilot',
  description: 'Enterprise Multi-Channel Social Media Posting Scheduler & AI Content Generator',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/omnisync-icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'OmniSync - Autonomous Social Media AI Autopilot',
    description: 'Enterprise Multi-Channel Social Media Posting Scheduler & AI Content Generator',
    url: 'https://omnisyncapp.com',
    siteName: 'OmniSync',
    images: [
      {
        url: '/omnisync-logo.jpg',
        width: 1024,
        height: 1024,
        alt: 'OmniSync AI Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
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
            <ConsoleGuard />
            <ToastContainer />
            <AppLayout>{children}</AppLayout>
          </StoreProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
