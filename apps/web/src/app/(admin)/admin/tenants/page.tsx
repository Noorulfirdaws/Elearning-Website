'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

const PLAN_STYLE: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-600',
  PROFESSIONAL: 'bg-green-100 text-green-700',
  ENTERPRISE: 'bg-purple-100 text-purple-700',
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tenants').then((r) => { setTenants(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.patch(`/tenants/${id}`, { isActive: !isActive });
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, isActive: !isActive } : t));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">{tenants.length} tenants</p>
        </div>
        <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
          + New Tenant
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Tenant</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Domain</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Plan</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Created</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-gray-400 text-xs">{tenant.slug}</p>
                </td>
                <td className="px-5 py-4 text-gray-500">{tenant.domain || '—'}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_STYLE[tenant.plan] || 'bg-gray-100'}`}>
                    {tenant.plan}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => toggleActive(tenant.id, tenant.isActive)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    {tenant.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
