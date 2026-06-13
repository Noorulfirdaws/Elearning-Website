'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from '@/lib/api';
import { Search, Shield, Ban, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';

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

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  ADMIN:       'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  INSTRUCTOR:  'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  STUDENT:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '👑 Propriétaire',
  ADMIN:       '🛡️ Admin',
  INSTRUCTOR:  '🎓 Instructeur',
  STUDENT:     '📚 Élève',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionMsg, setActionMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await axios.get('/users', {
        params: { search: search || undefined, role: roleFilter || undefined, page, limit: 15 },
      });
      setUsers(r.data.data?.users || r.data.data || []);
      setTotal(r.data.data?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const toggleBan = async (u: User) => {
    try {
      if (u.isBanned) {
        await axios.patch(`/users/${u.id}/unban`);
        showMsg(`✅ ${u.firstName} a été réactivé`);
      } else {
        await axios.patch(`/users/${u.id}/ban`, { reason: 'Action admin' });
        showMsg(`🚫 ${u.firstName} a été banni`);
      }
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isBanned: !x.isBanned } : x));
    } catch (e: any) {
      showMsg('❌ ' + (e.response?.data?.message || 'Erreur'));
    }
  };

  const changeRole = async (u: User, role: string) => {
    try {
      await axios.put(`/users/${u.id}/role`, { role });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
      showMsg(`✅ Rôle changé → ${ROLE_LABELS[role] || role}`);
    } catch (e: any) {
      showMsg('❌ ' + (e.response?.data?.message || 'Erreur'));
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Admin</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
              <p className="text-sm text-gray-400 mt-0.5">{total} utilisateur{total > 1 ? 's' : ''} au total</p>
            </div>
            {/* Toast */}
            {actionMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-xl shadow-lg"
              >
                {actionMsg}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Rechercher par nom ou email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">Tous les rôles</option>
            <option value="STUDENT">Élèves</option>
            <option value="INSTRUCTOR">Instructeurs</option>
            <option value="ADMIN">Admins</option>
            <option value="SUPER_ADMIN">Propriétaires</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400">Utilisateur</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400">Rôle</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400">Statut</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400">Inscrit le</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : users.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {/* Utilisateur */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-gray-400 text-xs">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Rôle */}
                  <td className="px-5 py-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-pointer border-0 outline-none ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'].map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                      ))}
                    </select>
                  </td>

                  {/* Statut */}
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      u.isBanned
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                    }`}>
                      {u.isBanned ? '🚫 Banni' : '✅ Actif'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('fr-DJ', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleBan(u)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        u.isBanned
                          ? 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-950 dark:text-green-400'
                          : 'bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950 dark:text-red-400'
                      }`}
                    >
                      {u.isBanned ? <><UserCheck className="h-3.5 w-3.5" /> Réactiver</> : <><Ban className="h-3.5 w-3.5" /> Bannir</>}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages} — {total} utilisateurs
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
