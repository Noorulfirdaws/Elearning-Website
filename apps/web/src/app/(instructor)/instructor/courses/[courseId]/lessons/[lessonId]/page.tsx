'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Video, FileText, Youtube, ExternalLink, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import axios from '@/lib/api';
import { toast } from 'sonner';

const LESSON_TYPES = ['VIDEO', 'TEXT', 'DOCUMENT', 'EMBED', 'QUIZ', 'ASSIGNMENT'] as const;

function isYouTubeUrl(url: string) {
  return /youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed|youtube\.com\/shorts/.test(url);
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function LessonEditPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: lesson, isLoading } = useQuery<any>({
    queryKey: ['lesson', lessonId],
    queryFn: () => axios.get(`/lessons/${lessonId}`).then(r => r.data.data),
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'VIDEO',
    videoUrl: '',
    embedUrl: '',
    content: '',
    duration: '',
    isFreePreview: false,
    isPublished: false,
  });

  useEffect(() => {
    if (lesson) {
      setForm({
        title: lesson.title || '',
        description: lesson.description || '',
        type: lesson.type || 'VIDEO',
        videoUrl: lesson.videoUrl || '',
        embedUrl: lesson.embedUrl || '',
        content: lesson.content || '',
        duration: lesson.duration ? String(lesson.duration) : '',
        isFreePreview: lesson.isFreePreview || false,
        isPublished: lesson.isPublished || false,
      });
    }
  }, [lesson]);

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        isFreePreview: form.isFreePreview,
      };
      if (form.videoUrl) payload.videoUrl = form.videoUrl;
      if (form.embedUrl) payload.embedUrl = form.embedUrl;
      if (form.content) payload.content = form.content;
      if (form.duration) payload.duration = parseInt(form.duration, 10);

      await axios.patch(`/lessons/${lessonId}`, payload);
      qc.invalidateQueries({ queryKey: ['lesson', lessonId] });
      qc.invalidateQueries({ queryKey: ['course-sections', courseId] });
      toast.success('Lesson saved!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const ytId = form.videoUrl ? getYouTubeId(form.videoUrl) : null;

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Lesson not found</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/instructor/courses/${courseId}/edit`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs text-muted-foreground">Lesson Editor</p>
              <h1 className="font-semibold text-sm truncate max-w-xs">{lesson.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, isFreePreview: !f.isFreePreview }))}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 border rounded-lg transition-colors ${
                form.isFreePreview ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-950' : 'hover:bg-muted'
              }`}
            >
              {form.isFreePreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {form.isFreePreview ? 'Free Preview: ON' : 'Free Preview: OFF'}
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-70 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Basic Info */}
        <section className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-base">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">Lesson Title <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Introduction to Variables"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this lesson covers"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Lesson Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              >
                {LESSON_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (seconds)</label>
              <input
                type="number"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                placeholder="e.g. 600 (= 10 min)"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
          </div>
        </section>

        {/* Video Content */}
        {(form.type === 'VIDEO' || form.type === 'EMBED') && (
          <section className="border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Content
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Video URL
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  YouTube, direct video link, or embed URL
                </span>
              </label>
              <div className="relative">
                <input
                  value={form.videoUrl}
                  onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=... or https://..."
                  className="w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                {form.videoUrl && (
                  <a
                    href={form.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* YouTube preview */}
              {ytId && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> YouTube video detected
                    </span>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden border bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                </div>
              )}

              {form.videoUrl && !ytId && (
                <p className="mt-2 text-xs text-green-600">Direct video URL — will be played with the built-in player.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Embed URL
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Optional — alternative embed (Vimeo, Loom, etc.)
                </span>
              </label>
              <input
                value={form.embedUrl}
                onChange={e => setForm(f => ({ ...f, embedUrl: e.target.value }))}
                placeholder="https://player.vimeo.com/video/..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
            </div>
          </section>
        )}

        {/* Text / Article Content */}
        {form.type === 'TEXT' && (
          <section className="border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Text Content
            </h2>
            <div>
              <label className="block text-sm font-medium mb-1.5">Lesson Content</label>
              <textarea
                rows={16}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your lesson content here (Markdown supported)..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-background resize-none font-mono text-sm"
              />
            </div>
          </section>
        )}

        {/* Save reminder at bottom */}
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-70 transition-colors font-medium"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
