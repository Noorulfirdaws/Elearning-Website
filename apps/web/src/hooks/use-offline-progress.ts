'use client';

/**
 * useOfflineProgress
 * ==================
 * Sauvegarde la progression d'un eleve directement dans le navigateur (IndexedDB).
 * Fonctionne SANS connexion internet.
 * Quand la connexion revient, synchronise automatiquement avec l'API.
 *
 * Structure IndexedDB :
 *   DB      : learnhub-offline
 *   Store   : progression
 *   Cle     : chapitreId
 *   Valeur  : { chapitreId, scoreQuiz, estComplete, reponses, visitedAt, syncedAt }
 */

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChapitreProgressLocal {
  chapitreId: string;
  scoreQuiz: number | null;        // Score du dernier quiz (0-100)
  meilleurScore: number | null;    // Meilleur score obtenu
  estComplete: boolean;            // true si score >= 60
  tentatives: number;              // Nombre de fois que le quiz a ete fait
  reponses: Record<number, string>; // Dernieres reponses choisies
  visitedAt: number;               // Timestamp derniere visite
  quizDoneAt: number | null;       // Timestamp dernier quiz
  synced: boolean;                 // Si synchronise avec le serveur
}

const DB_NAME = 'learnhub-offline';
const DB_VERSION = 1;
const STORE_NAME = 'progression';

// ─── Ouverture IndexedDB ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'chapitreId' });
      }
      // Store pour la file d'attente de sync
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'chapitreId' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(chapitreId: string): Promise<ChapitreProgressLocal | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(chapitreId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbPut(data: ChapitreProgressLocal): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silencieux si pas de support IndexedDB
  }
}

async function idbGetAll(): Promise<ChapitreProgressLocal[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useOfflineProgress(chapitreId: string) {
  const [progression, setProgression] = useState<ChapitreProgressLocal | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger la progression depuis IndexedDB au montage
  useEffect(() => {
    if (!chapitreId) return;

    idbGet(chapitreId).then((data) => {
      setProgression(data);
      setLoading(false);

      // Marquer comme visité
      const updated: ChapitreProgressLocal = data || {
        chapitreId,
        scoreQuiz: null,
        meilleurScore: null,
        estComplete: false,
        tentatives: 0,
        reponses: {},
        visitedAt: Date.now(),
        quizDoneAt: null,
        synced: false,
      };
      updated.visitedAt = Date.now();
      idbPut(updated);
    });
  }, [chapitreId]);

  /**
   * Sauvegarder le resultat d'un quiz
   * - Sauvegarde IMMEDIATEMENT dans IndexedDB (offline-safe)
   * - Essaie de synchroniser avec l'API en arriere-plan
   */
  const sauvegarderQuiz = useCallback(async (
    score: number,
    reponses: Record<number, string>,
    apiSyncFn?: () => Promise<void>,
  ) => {
    const estComplete = score >= 60;
    const existing = await idbGet(chapitreId);

    const updated: ChapitreProgressLocal = {
      chapitreId,
      scoreQuiz: score,
      meilleurScore: Math.max(score, existing?.meilleurScore ?? 0),
      estComplete: existing?.estComplete || estComplete,
      tentatives: (existing?.tentatives ?? 0) + 1,
      reponses,
      visitedAt: existing?.visitedAt ?? Date.now(),
      quizDoneAt: Date.now(),
      synced: false,
    };

    // 1. Sauvegarde locale IMMEDIATE
    await idbPut(updated);
    setProgression(updated);

    // 2. Synchronisation avec l'API (si en ligne)
    if (apiSyncFn && navigator.onLine) {
      try {
        await apiSyncFn();
        const synced = { ...updated, synced: true };
        await idbPut(synced);
        setProgression(synced);
      } catch {
        // Echec API : les donnees sont quand meme sauvees localement
        // Elles seront syncees plus tard via le service worker
        console.log('[Offline] Progression sauvegardee localement, sync en attente');
      }
    } else if (!navigator.onLine) {
      console.log('[Offline] Pas de connexion - progression sauvegardee localement');
      // Ajouter a la file d'attente de sync
      addToSyncQueue(chapitreId, score, estComplete);
    }

    return updated;
  }, [chapitreId]);

  return { progression, loading, sauvegarderQuiz };
}

// ─── File d'attente de synchronisation ───────────────────────────────────────

async function addToSyncQueue(chapitreId: string, score: number, estComplete: boolean) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sync-queue', 'readwrite');
      const req = tx.objectStore('sync-queue').put({
        chapitreId,
        score,
        estComplete,
        queuedAt: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

/**
 * Synchroniser toutes les progressions en attente avec l'API
 * A appeler au demarrage de l'app quand la connexion revient
 */
export async function syncPendingProgression(
  apiPost: (chapitreId: string, data: any) => Promise<void>,
) {
  try {
    const db = await openDB();
    const pending: any[] = await new Promise((resolve, reject) => {
      const tx = db.transaction('sync-queue', 'readonly');
      const req = tx.objectStore('sync-queue').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const item of pending) {
      try {
        await apiPost(item.chapitreId, {
          estComplete: item.estComplete,
          scoreQuiz: item.score,
        });

        // Supprimer de la file d'attente apres sync reussie
        await new Promise<void>((resolve) => {
          const tx = db.transaction('sync-queue', 'readwrite');
          tx.objectStore('sync-queue').delete(item.chapitreId);
          tx.oncomplete = () => resolve();
        });

        // Marquer comme synced dans progression
        const prog = await idbGet(item.chapitreId);
        if (prog) await idbPut({ ...prog, synced: true });

        console.log(`[Sync] Progression ${item.chapitreId} synchronisee`);
      } catch {
        console.log(`[Sync] Echec pour ${item.chapitreId}, sera retenté`);
      }
    }
  } catch {}
}

/**
 * Recuperer TOUTE la progression d'un eleve (pour le dashboard)
 */
export async function getAllLocalProgression(): Promise<ChapitreProgressLocal[]> {
  return idbGetAll();
}

/**
 * Effacer la progression locale d'un chapitre (pour les tests)
 */
export async function clearLocalProgression(chapitreId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(chapitreId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {}
}
