'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
  isFree: boolean;
  totalStudents: number;
  instructor: { firstName: string; lastName: string };
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  ARCHIVED: 'bg-orange-100 text-orange-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/courses/admin/all', { params: { search: search || undefined, limit: 50 } })
      .then((r) => { setCourses(r.data.data?.courses || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/courses/${id}/status`, { status });
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">{courses.length} courses found</p>
        </div>
        <input
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Course</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Instructor</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Students</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Price</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : courses.map((course) => (
              <tr key={course.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-900 line-clamp-1">{course.title}</p>
                  <p className="text-gray-400 text-xs">{course.slug}</p>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {course.instructor.firstName} {course.instructor.lastName}
                </td>
                <td className="px-5 py-4">
                  <select
                    value={course.status}
                    onChange={(e) => updateStatus(course.id, e.target.value)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${STATUS_STYLE[course.status] || 'bg-gray-100'}`}
                  >
                    {['DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNDER_REVIEW'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 text-gray-600">{course.totalStudents}</td>
                <td className="px-5 py-4 text-gray-600">
                  {course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}
                </td>
                <td className="px-5 py-4">
                  <Link href={`/courses/${course.slug}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
