'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface LearningPath {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  steps: any[];
  enrollment?: { progress: number; completedAt?: string };
}

export default function LearningPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/learning-paths').then((r) => {
      setPaths(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900">Learning Paths</h1>
        <p className="text-gray-500 mt-1">Structured journeys to master a skill end-to-end.</p>
      </div>

      {paths.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">🗺️</div>
          <p className="text-lg">No learning paths available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paths.map((path) => {
            const progress = path.enrollment?.progress ?? null;
            const completed = !!path.enrollment?.completedAt;
            return (
              <Link key={path.id} href={`/learning-paths/${path.id}`} className="group block bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
                {path.thumbnail && (
                  <img src={path.thumbnail} alt={path.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {path.title}
                    </h2>
                    {completed && (
                      <span className="ml-2 flex-shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        Completed ✓
                      </span>
                    )}
                  </div>
                  {path.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{path.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                    <span>{path.steps.length} steps</span>
                  </div>
                  {progress !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-indigo-600">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {progress === null && (
                    <span className="text-sm font-semibold text-indigo-600">Start Path →</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
