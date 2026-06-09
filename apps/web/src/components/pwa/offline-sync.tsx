'use client';

/**
 * OfflineSync
 * ===========
 * Composant invisible qui surveille la connexion reseau.
 * Quand l'eleve reconnecte son telephone :
 *   -> Synchronise automatiquement les progressions en attente avec l'API
 *   -> Affiche une notification discrete "Progression synchronisee"
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { syncPendingProgression } from '@/hooks/use-offline-progress';
import axios from '@/lib/api';

export function OfflineSync() {
  const wasOffline = useRef(false);

  useEffect(() => {
    // Fonction de sync appelee quand la connexion revient
    const handleOnline = async () => {
      if (!wasOffline.current) return; // Eviter le premier faux-positif au montage
      wasOffline.current = false;

      toast.info('Connexion retablie — synchronisation en cours...', {
        duration: 2000,
      });

      try {
        await syncPendingProgression(async (chapitreId, data) => {
          await axios.post(`/chapitres/${chapitreId}/progression`, data);
        });
        toast.success('Progression synchronisee avec succes', {
          duration: 3000,
          icon: '✅',
        });
      } catch {
        // Silencieux si la sync echoue — sera reessayee
      }
    };

    const handleOffline = () => {
      wasOffline.current = true;
      toast.warning('Mode hors-ligne — tes resultats sont sauvegardes localement', {
        duration: 4000,
        icon: '📴',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync au demarrage si certaines progressions attendent (telephone eteint avant sync)
    if (navigator.onLine) {
      syncPendingProgression(async (chapitreId, data) => {
        await axios.post(`/chapitres/${chapitreId}/progression`, data);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // Composant invisible
}
