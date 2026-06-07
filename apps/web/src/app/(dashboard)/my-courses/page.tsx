'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Enrollment {
  id: string;
  progress: number;
  completedAt?: string;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail?: string;
    instructor: { firstName: string; lastName: string };
    _count: { sections: number };
  };
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    api.get('/enrollments/my-enrollments').then((r) => {
      setEnrollments(r.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = enrollments.filter((e) => {
    if (filter === 'in-progress') return !e.completedAt && e.progress > 0;
    if (filter === 'completed') return !!e.completedAt;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-500 mt-1">{enrollments.length} enrolled course{enrollments.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/catalog" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Browse More
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'in-progress', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-400'}`}
          >
            {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : 'Completed'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-gray-400 text-lg">
            {filter === 'all' ? "You haven't enrolled in any courses yet." : `No ${filter} courses.`}
          </p>
          {filter === 'all' && (
            <Link href="/catalog" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
              Explore courses →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {e.course.thumbnail ? (
                <img src={e.course.thumbnail} alt={e.course.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <span className="text-4xl">📖</span>
                </div>
              )}
              <div className="p-5">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{e.course.title}</h3>
                <p className="text-xs text-gray-400 mb-4">
                  {e.course.instructor.firstName} {e.course.instructor.lastName}
                </p>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className={`font-semibold ${e.completedAt ? 'text-green-600' : 'text-indigo-600'}`}>
                      {e.completedAt ? '✓ Completed' : `${e.progress}%`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${e.completedAt ? 'bg-green-500' : 'bg-indigo-600'}`}
                      style={{ width: `${e.completedAt ? 100 : e.progress}%` }}
                    />
                  </div>
                </div>
                <Link
                  href={`/courses/${e.course.slug}`}
                  className="block text-center bg-indigo-50 text-indigo-600 rounded-xl py-2 text-sm font-semibold hover:bg-indigo-100 transition-colors"
                >
                  {e.progress > 0 ? 'Continue' : 'Start'} Learning
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
