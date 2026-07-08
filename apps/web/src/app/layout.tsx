import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { PWAInstallBanner } from '@/components/pwa/install-banner';
import { OfflineSync } from '@/components/pwa/offline-sync';

// Corps de texte — Inter · Titres — Plus Jakarta Sans
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'NoorAcademie Djibouti — Plateforme éducative', template: '%s | NoorAcademie Djibouti' },
  description: 'Cours gratuits pour les élèves de Djibouti — du collège (6ème) au lycée (Terminale). Maths, SVT, Physique, Français, Histoire-Géo.',
  keywords: ['cours djibouti', 'education djibouti', 'brevet djibouti', 'bac djibouti', 'collège lycée', 'mathématiques', 'SVT', 'physique'],
  authors: [{ name: 'NoorAcademie Djibouti' }],
  creator: 'NoorAcademie Djibouti',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NoorAcademie 🇩🇯',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'fr_DJ',
    siteName: 'NoorAcademie Djibouti',
    title: 'NoorAcademie Djibouti — Cours gratuits du collège au lycée',
    description: 'Plateforme éducative pour les élèves de Djibouti.',
  },
  twitter: { card: 'summary_large_image', title: 'NoorAcademie Djibouti 🇩🇯', description: 'Cours gratuits pour les élèves djiboutiens' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#22C55E' },
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
        <meta name="apple-mobile-web-app-title" content="NoorAcademie 🇩🇯" />
        {/* PWA — Microsoft */}
        <meta name="msapplication-TileImage" content="/icon-144.png" />
        <meta name="msapplication-TileColor" content="#2563EB" />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} font-sans min-h-screen bg-background antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" closeButton />
          <PWAInstallBanner />
          <OfflineSync />
        </Providers>
        {/* Enregistrement du Service Worker PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Le Service Worker est désactivé en développement local
              // (il mettait en cache des chunks JS et cassait le rechargement à chaud).
              var __swAllowed = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
              if ('serviceWorker' in navigator) {
                if (__swAllowed) {
                // Recharge automatiquement une seule fois quand une nouvelle version prend le contrôle
                var refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  if (refreshing) return;
                  refreshing = true;
                  window.location.reload();
                });
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      // Vérifie immédiatement et périodiquement s'il y a une mise à jour
                      reg.update();
                      setInterval(function() { reg.update(); }, 60 * 1000);
                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        newWorker.addEventListener('statechange', function() {
                          // Nouvelle version installée + déjà contrôlé => activer tout de suite
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.warn('[PWA] Enregistrement échoué:', err);
                    });
                });
                } else {
                  // Dev local : désinscrit tout Service Worker et vide les caches
                  // périmés (sinon la PWA sert des assets cassés → page sans CSS).
                  navigator.serviceWorker.getRegistrations().then(function(rs) {
                    var had = rs.length > 0;
                    rs.forEach(function(r) { r.unregister(); });
                    if (window.caches && caches.keys) {
                      caches.keys().then(function(ks) {
                        ks.forEach(function(k) { caches.delete(k); });
                        if (had) window.location.reload();
                      });
                    } else if (had) {
                      window.location.reload();
                    }
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
