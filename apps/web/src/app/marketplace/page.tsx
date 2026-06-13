'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';

interface InstructorProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  totalStudents: number;
  totalCourses: number;
  rating: number;
  isOnboarded: boolean;
}

export default function MarketplacePage() {
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [myAccount, setMyAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/marketplace/instructors').catch(() => ({ data: { data: [] } })),
      api.get('/marketplace/my-account').catch(() => ({ data: { data: null } })),
    ]).then(([instrRes, acctRes]) => {
      setInstructors(instrRes.data.data || []);
      setMyAccount(acctRes.data.data);
      setLoading(false);
    });
  }, []);

  const startOnboarding = async () => {
    const res = await api.post('/marketplace/onboard');
    window.location.href = res.data.data.onboardingUrl;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Instructor Marketplace</h1>
        <p className="text-gray-500 mt-1">Earn 70% revenue share on every sale. Get paid directly via Stripe.</p>
      </div>

      {/* Become an instructor CTA */}
      {!myAccount && (
        <div className="bg-gradient-to-br from-emerald-600 to-purple-600 rounded-2xl p-8 text-white mb-10">
          <h2 className="text-2xl font-bold mb-2">Start earning as an instructor</h2>
          <p className="text-emerald-100 mb-6">Create and sell courses. Keep 70% of every sale, paid out directly to your bank.</p>
          <div className="flex gap-6 mb-6">
            {[['70%', 'Revenue share'], ['$0', 'Upfront cost'], ['Instant', 'Payouts']].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-emerald-200 text-sm">{l}</p>
              </div>
            ))}
          </div>
          <button onClick={startOnboarding} className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors">
            Connect Stripe & Start Selling
          </button>
        </div>
      )}

      {/* My account status */}
      {myAccount && (
        <div className={`rounded-2xl p-6 mb-10 border ${myAccount.isOnboarded ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Your Instructor Account</p>
              <p className="text-sm text-gray-500 mt-1">
                {myAccount.isOnboarded ? '✅ Fully onboarded — you can receive payouts' : '⚠️ Onboarding incomplete — payouts disabled'}
              </p>
            </div>
            {!myAccount.isOnboarded && (
              <button onClick={startOnboarding} className="bg-yellow-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-yellow-600 transition-colors">
                Complete Onboarding
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top instructors */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-6">Top Instructors</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instr) => (
              <div key={instr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  {instr.avatar ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <Image src={instr.avatar} alt="" fill sizes="48px" className="object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-600">
                      {instr.firstName[0]}{instr.lastName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900">{instr.firstName} {instr.lastName}</p>
                    <p className="text-xs text-yellow-500">{'★'.repeat(Math.round(instr.rating))} {instr.rating.toFixed(1)}</p>
                  </div>
                </div>
                {instr.bio && <p className="text-sm text-gray-500 line-clamp-2 mb-4">{instr.bio}</p>}
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>📚 {instr.totalCourses} courses</span>
                  <span>👥 {instr.totalStudents} students</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
