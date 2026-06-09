import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { PWAInstallBanner } from '@/components/pwa/install-banner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'LearnHub Djibouti — Plateforme éducative', template: '%s | LearnHub Djibouti' },
  description: 'Cours gratuits pour les élèves de Djibouti — du collège (6ème) au lycée (Terminale). Maths, SVT, Physique, Français, Histoire-Géo.',
  keywords: ['cours djibouti', 'education djibouti', 'brevet djibouti', 'bac djibouti', 'collège lycée', 'mathématiques', 'SVT', 'physique'],
  authors: [{ name: 'LearnHub Djibouti' }],
  creator: 'LearnHub Djibouti',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LearnHub 🇩🇯',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'fr_DJ',
    siteName: 'LearnHub Djibouti',
    title: 'LearnHub Djibouti — Cours gratuits du collège au lycée',
    description: 'Plateforme éducative pour les élèves de Djibouti.',
  },
  twitter: { card: 'summary_large_image', title: 'LearnHub Djibouti 🇩🇯', description: 'Cours gratuits pour les élèves djiboutiens' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563EB' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* PWA — Apple */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LearnHub 🇩🇯" />
        {/* PWA — Microsoft */}
        <meta name="msapplication-TileImage" content="/icon-144.png" />
        <meta name="msapplication-TileColor" content="#2563EB" />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-background antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" closeButton />
          <PWAInstallBanner />
        </Providers>
        {/* Enregistrement du Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[PWA] Service Worker enregistré:', reg.scope);
                      reg.addEventListener('updatefound', function() {
                        const newWorker = reg.installing;
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] Nouvelle version disponible');
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.warn('[PWA] Enregistrement échoué:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
