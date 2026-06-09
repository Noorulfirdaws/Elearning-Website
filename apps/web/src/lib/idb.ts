'use client';
/**
 * idb.ts — Module partagé IndexedDB LearnHub
 * ===========================================
 * Point d'entrée unique pour l'ouverture de la base de données locale.
 * Garantit que TOUTES les extensions de version sont gérées ici.
 *
 * DB      : learnhub-offline  (version 2)
 * Stores  :
 *   - progression  : ChapitreProgressLocal (clé: chapitreId)
 *   - sync-queue   : progressions en attente de sync serveur
 *   - permissions  : droits d'accès offline (paywall cache)
 */

const DB_NAME    = 'learnhub-offline';
export const DB_VERSION = 2;

export function openLearnHubDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // v1 stores (progression + sync-queue)
      if (!db.objectStoreNames.contains('progression')) {
        db.createObjectStore('progression', { keyPath: 'chapitreId' });
      }
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'chapitreId' });
      }
      // v2 store (permissions offline — cache paywall)
      if (!db.objectStoreNames.contains('permissions')) {
        db.createObjectStore('permissions', { keyPath: 'key' });
      }
    };

    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
    req.onblocked  = () => {
      console.warn('[LearnHub IDB] DB bloquée — fermer les autres onglets');
      reject(new Error('IDB blocked'));
    };
  });
}
