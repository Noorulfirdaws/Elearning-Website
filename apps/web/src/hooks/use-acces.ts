'use client';

import { useState, useEffect, useCallback } from 'react';
import { openLearnHubDB } from '@/lib/idb';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type TypeAcces = 'CHAPITRE' | 'CLASSE' | 'EXAMEN';
export type RaisonAcces = 'GRATUIT' | 'ACHAT_VALIDE' | 'ACCES_CLASSE' | 'ACCES_EXAMEN' | 'ROLE_ADMIN' | 'NON_ACHETE';

export interface PermissionsOffline {
  chapitres:   string[];
  classes:     string[];
  examens:     string[];
  generatedAt: string;
}

export interface TarifsAcces {
  CHAPITRE: number;
  CLASSE:   number;
  EXAMEN:   number;
}

export const TARIFS_DJF: TarifsAcces = {
  CHAPITRE: 1000,
  CLASSE:   5000,
  EXAMEN:  10000,
};

const STORE_PERMS = 'permissions';
const openDB = openLearnHubDB;

async function getPermissionsFromDB(): Promise<PermissionsOffline | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_PERMS, 'readonly');
      const req = tx.objectStore(STORE_PERMS).get('perms');
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror   = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function savePermissionsToDB(perms: PermissionsOffline): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(STORE_PERMS, 'readwrite');
      tx.objectStore(STORE_PERMS).put({ key: 'perms', data: perms });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  } catch {}
}

export function verifierAccesLocal(
  perms: PermissionsOffline | null,
  chapitreId: string,
  niveauId: string,
  estPremierChapitre: boolean,
): { autorise: boolean; raison: RaisonAcces } {
  if (estPremierChapitre) return { autorise: true,  raison: 'GRATUIT'    };
  if (!perms)             return { autorise: false, raison: 'NON_ACHETE' };
  if (perms.chapitres.includes(chapitreId)) return { autorise: true, raison: 'ACHAT_VALIDE' };
  if (perms.classes.includes(niveauId))     return { autorise: true, raison: 'ACCES_CLASSE' };
  if (perms.examens.length > 0)             return { autorise: true, raison: 'ACCES_EXAMEN' };
  return { autorise: false, raison: 'NON_ACHETE' };
}

interface UseAccesOptions {
  chapitreId:         string;
  niveauId:           string;
  estPremierChapitre: boolean;
  token?:             string | null;
}

interface UseAccesResult {
  autorise:   boolean;
  chargement: boolean;
  raison:     RaisonAcces;
  tarifs:     TarifsAcces;
  rafraichir: () => void;
}

export function useAcces({ chapitreId, niveauId, estPremierChapitre, token }: UseAccesOptions): UseAccesResult {
  const [autorise,   setAutorise]   = useState(estPremierChapitre);
  const [raison,     setRaison]     = useState<RaisonAcces>(estPremierChapitre ? 'GRATUIT' : 'NON_ACHETE');
  const [chargement, setChargement] = useState(!estPremierChapitre);

  const verifier = useCallback(async () => {
    if (estPremierChapitre) {
      setAutorise(true); setRaison('GRATUIT'); setChargement(false);
      return;
    }
    setChargement(true);

    // 1. Cache local IndexedDB
    const permsLocales = await getPermissionsFromDB();
    const local = verifierAccesLocal(permsLocales, chapitreId, niveauId, false);
    if (local.autorise) { setAutorise(true); setRaison(local.raison); }

    // 2. Vérification API si online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/achats/verifier/${chapitreId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAutorise(data.autorise);
          setRaison(data.raison);
        }

        if (token) {
          const resPerms = await fetch(`${API_BASE}/achats/permissions-offline`, { headers });
          if (resPerms.ok) {
            const body = await resPerms.json();
            // Support ancien format (plain JSON) et nouveau (token signé)
            const perms = body.payload ?? body;
            if (perms.chapitres) await savePermissionsToDB(perms);
          }
        }
      } catch {}
    }

    setChargement(false);
  }, [chapitreId, niveauId, estPremierChapitre, token]);

  useEffect(() => { verifier(); }, [verifier]);

  return { autorise, chargement, raison, tarifs: TARIFS_DJF, rafraichir: verifier };
}

export async function rafraichirPermissionsOffline(token: string): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/achats/permissions-offline`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const body = await res.json();
      const perms = body.payload ?? body;
      if (perms.chapitres) await savePermissionsToDB(perms);
    }
  } catch {}
}
