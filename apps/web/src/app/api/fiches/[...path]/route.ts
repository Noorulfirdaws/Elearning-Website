import { readFile } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { type NextRequest } from 'next/server';

// Sert les fiches PDF privées (hors de public/) UNIQUEMENT aux utilisateurs
// autorisés : instructeur/admin, OU accès Classe acheté pour le niveau.
// La vérification s'appuie sur le backend (source de vérité) via le token.

export const dynamic = 'force-dynamic';

const API =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api/v1';

const ROOT = join(process.cwd(), 'fiches-privees');

// Dossier de fiches → niveau requis pour l'accès Classe.
const FOLDER_NIVEAU: Record<string, string> = {
  'maths-6eme': 'C6',
  'maths-5eme': 'C5',
};

const ROLES_STAFF = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'];

async function jsonWithToken(path: string, token: string) {
  const res = await fetch(`${API.replace(/\/$/, '')}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json().catch(() => null);
}

async function estAutorise(token: string, niveauId: string): Promise<boolean> {
  if (!token) return false;

  // 1) Token valide + rôle (instructeur/admin passent partout).
  const me = await jsonWithToken('/auth/me', token);
  const role = me?.data?.role ?? me?.role;
  if (!role) return false; // token invalide/expiré
  if (ROLES_STAFF.includes(role)) return true;

  // 2) Sinon : accès Classe acheté pour ce niveau.
  const perms = await jsonWithToken('/achats/permissions-offline', token);
  const classes: string[] = perms?.data?.classes ?? perms?.classes ?? [];
  return classes.includes(niveauId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  const parts = params.path ?? [];
  const [folder, file] = parts;
  const niveauId = folder ? FOLDER_NIVEAU[folder] : undefined;

  // Validation stricte du nom de fichier (anti path-traversal).
  if (!niveauId || !file || !/^chapitre\d+-cours\d+\.pdf$/.test(file)) {
    return new Response('Not found', { status: 404 });
  }

  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!(await estAutorise(token, niveauId))) {
    return new Response(
      JSON.stringify({ success: false, error: 'Accès Classe requis' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  const abs = normalize(join(ROOT, folder, file));
  if (!abs.startsWith(ROOT + sep)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    const buf = await readFile(abs);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${file}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
