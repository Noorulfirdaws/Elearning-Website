'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.post('/auth/verify-email', { token })
      .then((res) => {
        const result = res.data.data;
        if (result?.user) {
          setUser(result.user);
          setTokens(result.accessToken, result.refreshToken);
        }
        setStatus('success');
        setTimeout(() => router.push('/dashboard'), 2500);
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h2>
            <p className="text-gray-500 mb-6">Your account is now active. Taking you to the dashboard…</p>
            <Link href="/dashboard" className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
              Go to Dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
            <p className="text-gray-500 mb-6">The link is invalid or has expired. Request a new one below.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/check-email" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition text-sm">
                Resend email
              </Link>
              <Link href="/login" className="inline-block border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition text-sm">
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
