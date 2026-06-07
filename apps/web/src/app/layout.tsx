import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'LearnHub — World-Class Online Learning', template: '%s | LearnHub' },
  description: 'Learn from the best instructors. Build real skills. Advance your career with LearnHub — the modern learning platform.',
  keywords: ['online learning', 'courses', 'education', 'e-learning', 'LMS'],
  authors: [{ name: 'LearnHub' }],
  creator: 'LearnHub',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LearnHub',
    title: 'LearnHub — World-Class Online Learning',
    description: 'Learn from the best instructors. Build real skills.',
  },
  twitter: { card: 'summary_large_image', title: 'LearnHub', description: 'World-Class Online Learning' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: 'white' }, { media: '(prefers-color-scheme: dark)', color: '#0f172a' }],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </Providers>
      </body>
    </html>
  );
}
