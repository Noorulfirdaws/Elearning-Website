'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

const ALL_SCOPES = ['courses:read', 'courses:write', 'enrollments:read', 'analytics:read', 'users:read'];

export default function DeveloperPortalPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['courses:read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    api.get('/developer/api-keys').then((r) => setKeys(r.data.data || [])).catch(() => {});
    api.get('/developer/openapi').then((r) => setSpec(r.data)).catch(() => {});
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/developer/api-keys', { name: newKeyName, scopes: selectedScopes });
      setCreatedKey(res.data.data.rawKey);
      setKeys((prev) => [res.data.data, ...prev]);
      setNewKeyName('');
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id: string) => {
    await api.delete(`/developer/api-keys/${id}`);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Developer Portal</h1>
        <p className="text-gray-500 mt-1">Manage API keys and explore the platform API.</p>
      </div>

      {/* Created key banner */}
      {createdKey && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-green-800 font-semibold mb-2">🔑 API Key Created — save it now, it won't be shown again!</p>
          <code className="block bg-green-100 rounded-lg p-3 text-green-900 font-mono text-sm break-all">{createdKey}</code>
          <button onClick={() => { navigator.clipboard.writeText(createdKey); }} className="mt-3 text-xs text-green-700 font-medium hover:underline">
            Copy to clipboard
          </button>
        </div>
      )}

      {/* Create key form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Create New API Key</h2>
        <div className="flex gap-3 mb-4">
          <input
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Key name (e.g. My Integration)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ALL_SCOPES.map((scope) => (
            <button
              key={scope}
              onClick={() =>
                setSelectedScopes((prev) =>
                  prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedScopes.includes(scope)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
              }`}
            >
              {scope}
            </button>
          ))}
        </div>
        <button
          onClick={createKey}
          disabled={loading || !newKeyName.trim()}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Key'}
        </button>
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Your API Keys</h2>
        {keys.length === 0 ? (
          <p className="text-gray-400 text-sm">No API keys yet.</p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-800">{key.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{key.prefix}…</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {key.scopes.map((s) => (
                      <span key={s} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => revokeKey(key.id)}
                  className="text-red-500 text-sm font-medium hover:text-red-700 transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OpenAPI spec link */}
      <div className="bg-emerald-50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-2">API Documentation</h2>
        <p className="text-emerald-700 text-sm mb-3">Explore all available endpoints with our interactive API reference.</p>
        <a
          href="/api/v1/developer/openapi"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          View OpenAPI Spec ↗
        </a>
      </div>
    </div>
  );
}
