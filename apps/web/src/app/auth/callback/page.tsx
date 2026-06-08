'use client';

/**
 * OAuth Callback Page — /auth/callback
 *
 * After Google/GitHub OAuth the API redirects to:
 *   http://localhost:3000/auth/callback#token=ACCESS&refresh=REFRESH
 *
 * Tokens are in the URL fragment (#) so they are never sent to any server.
 * This page reads the fragment, stores the tokens, fetches the user, then
 * redirects to the appropriate dashboard.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);
    const accessToken = params.get('token');
    const refreshToken = params.get('refresh');

    if (!accessToken || !refreshToken) {
      setStatus('error');
      return;
    }

    // Store tokens first so the /auth/me request is authenticated
    setTokens(accessToken, refreshToken);

    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => {
        const user = res.data.data ?? res.data;
        setUser(user);

        const role = user?.role;
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') router.replace('/admin');
        else if (role === 'INSTRUCTOR') router.replace('/instructor');
        else router.replace('/dashboard');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Signing you in…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign-in failed</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Something went wrong during OAuth sign-in. Please try again.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
