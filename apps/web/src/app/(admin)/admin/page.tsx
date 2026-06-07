'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/analytics/admin-overview').then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '—', icon: '👥', href: '/admin/users', color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Courses', value: stats?.totalCourses ?? '—', icon: '📚', href: '/admin/courses', color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Enrollments', value: stats?.activeEnrollments ?? '—', icon: '📈', href: '/admin/analytics', color: 'bg-green-50 text-green-600' },
    { label: 'Revenue (MRR)', value: stats?.mrr ? `$${(stats.mrr / 100).toFixed(0)}` : '—', icon: '💰', href: '/admin/analytics', color: 'bg-yellow-50 text-yellow-600' },
  ];

  const quickLinks = [
    { label: 'Manage Users', href: '/admin/users', icon: '👤' },
    { label: 'Manage Courses', href: '/admin/courses', icon: '🎓' },
    { label: 'Tenants', href: '/admin/tenants', icon: '🏢' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📊' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-2xl mb-3`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.label} href={link.href} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="text-3xl mb-2">{link.icon}</div>
            <p className="font-semibold text-gray-800">{link.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
