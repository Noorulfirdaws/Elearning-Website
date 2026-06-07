'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import {
  Save, Plus, Trash2, GripVertical, Video, FileText, File, ChevronDown,
  ChevronUp, Globe, EyeOff, Wand2, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import axios, { apiRoutes } from '@/lib/api';
import { toast } from 'sonner';

const LESSON_TYPE_ICONS: Record<string, any> = {
  VIDEO: Video, TEXT: FileText, DOCUMENT: File, QUIZ: FileText, ASSIGNMENT: File,
};

export default function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'content' | 'settings' | 'pricing'>('content');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: course } = useQuery<any>({
    queryKey: ['course-edit', courseId],
    queryFn: () => axios.get(apiRoutes.courses.getById(courseId)).then(r => r.data.data),
  });

  const { data: sections, refetch: refetchSections } = useQuery<any[]>({
    queryKey: ['course-sections', courseId],
    queryFn: () => axios.get(`/courses/${courseId}/sections`).then(r => r.data.data),
  });

  const addSection = async () => {
    try {
      await axios.post(`/courses/${courseId}/sections`, { title: 'New Section' });
      refetchSections();
    } catch { toast.error('Failed to add section'); }
  };

  const addLesson = async (sectionId: string) => {
    try {
      await axios.post(`/sections/${sectionId}/lessons`, { title: 'New Lesson', type: 'VIDEO' });
      refetchSections();
    } catch { toast.error('Failed to add lesson'); }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lessons?')) return;
    try {
      await axios.delete(`/courses/${courseId}/sections/${sectionId}`);
      refetchSections();
    } catch { toast.error('Failed to delete section'); }
  };

  const publishCourse = async () => {
    setSaving(true);
    try {
      const action = course?.status === 'PUBLISHED' ? 'unpublish' : 'publish';
      await axios.patch(apiRoutes.courses.publish(courseId));
      qc.invalidateQueries({ queryKey: ['course-edit', courseId] });
      toast.success(`Course ${action}ed successfully`);
    } catch { toast.error('Failed to update course status'); }
    finally { setSaving(false); }
  };

  const generateOutline = async () => {
    setGenerating(true);
    try {
      const { data } = await axios.post(apiRoutes.ai.generateOutline, {
        title: course?.title,
        description: course?.description,
        level: course?.level,
      });
      // Create sections+lessons from AI outline
      for (const section of data.data.sections || []) {
        const { data: sec } = await axios.post(`/courses/${courseId}/sections`, { title: section.title });
        for (const lesson of section.lessons || []) {
          await axios.post(`/sections/${sec.data.id}/lessons`, {
            title: lesson.title, type: lesson.type || 'VIDEO', description: lesson.description,
          });
        }
      }
      refetchSections();
      toast.success('AI outline generated!');
    } catch { toast.error('Failed to generate outline'); }
    finally { setGenerating(false); }
  };

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/instructor" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-semibold text-sm truncate max-w-xs">{course.title}</h1>
              <span className={`text-xs ${course.status === 'PUBLISHED' ? 'text-green-600' : 'text-yellow-600'}`}>
                {course.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/courses/${course.slug}`} target="_blank"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 border rounded-lg">
              Preview
            </Link>
            <button
              onClick={publishCourse}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-70"
            >
              {course.status === 'PUBLISHED' ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              {course.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-4 border-t">
          {(['content', 'settings', 'pricing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Course Curriculum</h2>
              <div className="flex gap-2">
                <button
                  onClick={generateOutline}
                  disabled={generating}
                  className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-70"
                >
                  <Wand2 className="h-4 w-4" />
                  {generating ? 'Generating...' : 'AI Generate'}
                </button>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Add Section
                </button>
              </div>
            </div>

            {sections?.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">No sections yet. Add a section to get started.</p>
              </div>
            )}

            {sections?.map((section: any) => {
              const isOpen = openSections.has(section.id);
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4 bg-muted/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <button
                      onClick={() => {
                        const next = new Set(openSections);
                        isOpen ? next.delete(section.id) : next.add(section.id);
                        setOpenSections(next);
                      }}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="font-medium">{section.title}</span>
                      <span className="text-xs text-muted-foreground">({section.lessons?.length || 0} lessons)</span>
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="divide-y">
                      {section.lessons?.map((lesson: any) => {
                        const Icon = LESSON_TYPE_ICONS[lesson.type] || File;
                        return (
                          <div key={lesson.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-sm">{lesson.title}</span>
                            <span className="text-xs text-muted-foreground">{lesson.type}</span>
                            <Link
                              href={`/instructor/courses/${courseId}/lessons/${lesson.id}`}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit
                            </Link>
                          </div>
                        );
                      })}
                      <div className="px-6 py-3">
                        <button
                          onClick={() => addLesson(section.id)}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Lesson
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'settings' && (
          <CourseSettingsForm course={course} courseId={courseId} />
        )}

        {activeTab === 'pricing' && (
          <CoursePricingForm course={course} courseId={courseId} />
        )}
      </div>
    </div>
  );
}

function CourseSettingsForm({ course, courseId }: { course: any; courseId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: course.title || '',
    description: course.description || '',
    shortDescription: course.shortDescription || '',
    level: course.level || 'BEGINNER',
    language: course.language || 'English',
    tags: (course.tags || []).join(', '),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(apiRoutes.courses.update(courseId), {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      qc.invalidateQueries({ queryKey: ['course-edit', courseId] });
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1.5">Course Title</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Short Description</label>
        <input
          value={form.shortDescription}
          onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Full Description</label>
        <textarea
          rows={6}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Level</label>
          <select
            value={form.level}
            onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Language</label>
          <input
            value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Tags (comma-separated)</label>
        <input
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="javascript, react, web development"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-70"
      >
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function CoursePricingForm({ course, courseId }: { course: any; courseId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    price: course.price || 0,
    comparePrice: course.comparePrice || '',
    isFree: course.isFree || false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(apiRoutes.courses.update(courseId), {
        price: form.isFree ? 0 : +form.price,
        comparePrice: form.comparePrice ? +form.comparePrice : null,
        isFree: form.isFree,
      });
      qc.invalidateQueries({ queryKey: ['course-edit', courseId] });
      toast.success('Pricing saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-md">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isFree}
          onChange={e => setForm(f => ({ ...f, isFree: e.target.checked }))}
          className="w-4 h-4 accent-primary"
        />
        <span className="font-medium">Free course</span>
      </label>
      {!form.isFree && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Price (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value as any }))}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Compare Price (optional, shows as crossed out)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.comparePrice}
              onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value as any }))}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Original price"
            />
          </div>
        </>
      )}
      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-70"
      >
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Pricing'}
      </button>
    </div>
  );
}
