'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import axios, { apiRoutes } from '@/lib/api';
import { toast } from 'sonner';

export default function NewCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', level: 'BEGINNER' });
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setCreating(true);
    try {
      const { data } = await axios.post(apiRoutes.courses.create, form);
      router.push(`/instructor/courses/${data.data.id}/edit`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create course');
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link href="/instructor" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-2">Create New Course</h1>
        <p className="text-muted-foreground mb-8">You can edit all details after creating.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Course Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. The Complete Python Bootcamp"
              className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && create()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Short Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what students will learn"
              className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Level</label>
            <select
              value={form.level}
              onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <button
            onClick={create}
            disabled={creating}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Create Course & Start Building'}
          </button>
        </div>
      </div>
    </div>
  );
}
