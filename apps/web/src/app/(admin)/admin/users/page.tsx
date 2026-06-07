'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users/admin/all', { params: { search: search || undefined, page, limit: 20 } });
      setUsers(r.data.data.users || []);
      setTotal(r.data.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, page]);

  const banUser = async (id: string, banned: boolean) => {
    await api.patch(`/users/admin/${id}/ban`, { banned });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBanned: banned } : u));
  };

  const changeRole = async (id: string, role: string) => {
    await api.patch(`/users/admin/${id}/role`, { role });
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
  };

  const ROLE_BADGE: Record<string, string> = {
    SUPER_ADMIN: 'bg-red-100 text-red-700',
    ADMIN: 'bg-orange-100 text-orange-700',
    INSTRUCTOR: 'bg-blue-100 text-blue-700',
    STUDENT: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{total} total users</p>
        </div>
        <input
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">User</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Role</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Joined</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-gray-400">{user.email}</p>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {user.isBanned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => banUser(user.id, !user.isBanned)}
                    className={`text-xs font-medium ${user.isBanned ? 'text-green-600 hover:text-green-800' : 'text-red-500 hover:text-red-700'} transition-colors`}
                  >
                    {user.isBanned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
