import { type NextRequest } from 'next/server';

// Proxy same-origin vers l'API (Railway). On RETIRE l'en-tête `Origin`
// (et Referer/Host) pour que la vérification CORS de l'API — qui autorise
// les requêtes « sans origine » — laisse passer le dev local (localhost:3000).
// Auparavant un rewrite Next transmettait l'Origin → l'API renvoyait 500 « Not allowed by CORS ».

export const dynamic = 'force-dynamic';

const TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api/v1';

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const url = `${TARGET.replace(/\/$/, '')}/${path.join('/')}${search}`;

  const headers = new Headers(req.headers);
  headers.delete('origin');
  headers.delete('referer');
  headers.delete('host');
  headers.delete('content-length'); // recalculé par fetch

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Passerelle API injoignable', detail: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }

  // On nettoie les en-têtes qui casseraient la réponse re-streamée.
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');
  resHeaders.delete('content-length');
  resHeaders.delete('transfer-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

type Ctx = { params: { path?: string[] } };
const handler = (req: NextRequest, { params }: Ctx) => proxy(req, params.path ?? []);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
