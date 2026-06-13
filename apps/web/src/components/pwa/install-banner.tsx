'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, GraduationCap, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Déjà installé ?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    // Déjà refusé récemment ?
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Attendre 3s avant d'afficher pour ne pas interrompre la navigation
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setVisible(false); });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setVisible(false);
  };

  if (installed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-4">

            {/* Icône app */}
            <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                Installer NoorAcademie 🇩🇯
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">
                Ajoute l'application sur ton écran d'accueil. Accès rapide + mode hors ligne.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Installer
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>

            {/* Fermer */}
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Indicateur mobile */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Smartphone className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-400">Fonctionne sans connexion internet</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
