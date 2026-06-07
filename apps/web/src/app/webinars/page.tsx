'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Webinar {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  scheduledAt: string;
  durationMins: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  host: { firstName: string; lastName: string; avatar?: string };
  _count: { registrations: number };
  isRegistered: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  LIVE: 'bg-red-100 text-red-700 animate-pulse',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ENDED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-orange-100 text-orange-700',
};

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/webinars').then((r) => {
      setWebinars(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const register = async (id: string) => {
    await api.post(`/webinars/${id}/register`);
    setWebinars((prev) => prev.map((w) => w.id === id ? { ...w, isRegistered: true } : w));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Live Webinars</h1>
        <p className="text-gray-500 mt-1">Join live sessions with industry experts.</p>
      </div>

      {webinars.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">📡</div>
          <p className="text-lg">No webinars scheduled yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {webinars.map((w) => (
            <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {w.thumbnail && <img src={w.thumbnail} alt={w.title} className="w-full h-44 object-cover" />}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[w.status]}`}>
                    {w.status === 'LIVE' ? '● LIVE' : w.status}
                  </span>
                  <span className="text-xs text-gray-400">{w._count.registrations} registered</span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">{w.title}</h2>
                {w.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{w.description}</p>}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span>📅 {format(new Date(w.scheduledAt), 'MMM d, yyyy · h:mm a')}</span>
                  <span>· {w.durationMins}min</span>
                </div>
                <div className="flex items-center gap-2 mb-5">
                  {w.host.avatar && <img src={w.host.avatar} alt="" className="w-8 h-8 rounded-full" />}
                  <span className="text-sm text-gray-600">
                    {w.host.firstName} {w.host.lastName}
                  </span>
                </div>
                {w.status === 'LIVE' ? (
                  <Link
                    href={`/webinars/${w.id}/room`}
                    className="block text-center bg-red-600 text-white rounded-xl py-2.5 font-semibold hover:bg-red-700 transition-colors"
                  >
                    Join Now →
                  </Link>
                ) : w.status === 'SCHEDULED' ? (
                  w.isRegistered ? (
                    <div className="text-center text-sm font-medium text-green-600 bg-green-50 rounded-xl py-2.5">
                      ✓ Registered
                    </div>
                  ) : (
                    <button
                      onClick={() => register(w.id)}
                      className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Register
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
