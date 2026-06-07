'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function CheckEmailPage() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
      toast.success('Verification email resent!');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="font-semibold text-gray-900 mb-6">{email}</p>
        )}
        <p className="text-gray-500 text-sm mb-8">
          Click the link in the email to activate your account. It expires in 24 hours.
        </p>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-8 text-sm text-amber-800">
          <p className="font-medium mb-1">📬 Didn't receive it?</p>
          <ul className="space-y-1 text-amber-700 list-disc list-inside">
            <li>Check your spam / junk folder</li>
            <li>Make sure the email address is correct</li>
            <li>Wait a minute and try resending</li>
          </ul>
        </div>

        {/* Resend button */}
        <button
          onClick={resend}
          disabled={resending || sent}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
          {sent ? 'Email resent!' : resending ? 'Resending…' : 'Resend verification email'}
        </button>

        <Link href="/login" className="text-sm text-indigo-600 hover:underline font-medium">
          Back to login
        </Link>
      </div>
    </div>
  );
}
