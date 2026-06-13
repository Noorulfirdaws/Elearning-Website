'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, CheckCircle, Circle, Menu, X,
  MessageSquare, StickyNote, BookOpen, Award, Send, Plus, Download,
  Bot, ChevronDown, Video, FileText, HelpCircle, ClipboardList,
} from 'lucide-react';
import { api, apiRoutes } from '@/lib/api';
import { VideoPlayer } from '@/components/player/video-player';
import { useAuthStore } from '@/store/auth.store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = ['lessons', 'notes', 'discussion', 'ai'] as const;
type Tab = typeof TABS[number];

const lessonTypeIcon = (type: string) => {
  switch (type) {
    case 'VIDEO': return <Video className="w-4 h-4" />;
    case 'QUIZ': return <HelpCircle className="w-4 h-4" />;
    case 'ASSIGNMENT': return <ClipboardList className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export default function CoursePlayerPage() {
  const { courseId, lessonId } = useParams() as { courseId: string; lessonId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('lessons');
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const { data: progress } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: () => api.get(apiRoutes.progress.course(courseId)).then((r) => r.data.data),
    enabled: !!courseId && isAuthenticated,
  });

  const currentSection = progress?.enrollment?.course?.sections?.find((s: any) =>
    s.lessons.some((l: any) => l.id === lessonId),
  );
  const currentLesson = currentSection?.lessons?.find((l: any) => l.id === lessonId);
  const allLessons = progress?.enrollment?.course?.sections?.flatMap((s: any) =>
    s.lessons.map((l: any) => ({ ...l, sectionTitle: s.title })),
  ) || [];
  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = allLessons[currentIndex - 1];
  const nextLesson = allLessons[currentIndex + 1];

  const progressMap = new Map(progress?.progress?.map((p: any) => [p.lessonId, p]) || []);
  const lessonProgress = progressMap.get(lessonId) as any;

  const { data: notes } = useQuery({
    queryKey: ['notes', lessonId],
    queryFn: () => api.get(`/notes?lessonId=${lessonId}`).then((r) => r.data.data),
    enabled: !!lessonId,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', lessonId],
    queryFn: () => api.get(`/comments?lessonId=${lessonId}`).then((r) => r.data.data),
    enabled: !!lessonId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: (data: any) => api.post(apiRoutes.progress.update(lessonId), data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] }),
  });

  const markCompleteMutation = useMutation({
    mutationFn: () => api.post(apiRoutes.progress.update(lessonId), { isCompleted: true }),
    onSuccess: () => {
      toast.success('Lesson marked as complete!');
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
      if (nextLesson) router.push(`/dashboard/courses/${courseId}/learn/${nextLesson.id}`);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: (content: string) => api.post('/notes', { lessonId, content }),
    onSuccess: () => { setNote(''); queryClient.invalidateQueries({ queryKey: ['notes', lessonId] }); toast.success('Note saved!'); },
  });

  const postCommentMutation = useMutation({
    mutationFn: (content: string) => api.post('/comments', { lessonId, content }),
    onSuccess: () => { setComment(''); queryClient.invalidateQueries({ queryKey: ['comments', lessonId] }); },
  });

  const sendAiMessage = async () => {
    if (!aiMessage.trim()) return;
    const newMessages = [...aiMessages, { role: 'user' as const, content: aiMessage }];
    setAiMessages(newMessages);
    setAiMessage('');
    try {
      const res = await api.post(apiRoutes.ai.chat, {
        messages: newMessages,
        context: `Course: ${progress?.enrollment?.course?.title}. Lesson: ${currentLesson?.title}`,
      });
      setAiMessages([...newMessages, { role: 'assistant', content: res.data.data }]);
    } catch {
      toast.error('AI tutor unavailable. Please try again.');
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const course = progress.enrollment?.course;
  const completedCount = progress.completedCount || 0;
  const totalCount = progress.totalCount || 1;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="hidden md:block">
            <p className="text-white font-medium text-sm truncate max-w-xs">{course?.title}</p>
            <p className="text-gray-400 text-xs">{currentLesson?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-32 bg-gray-700 rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-gray-400 text-xs">{progressPct}% complete</span>
          </div>
          {!lessonProgress?.isCompleted && (
            <button
              onClick={() => markCompleteMutation.mutate()}
              disabled={markCompleteMutation.isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline">Mark Complete</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900 border-r border-gray-800 course-sidebar flex-shrink-0 overflow-hidden"
            >
              <div className="w-80 p-4">
                {/* Tab nav */}
                <div className="flex bg-gray-800 rounded-xl p-1 mb-4">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors', activeTab === tab ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white')}
                    >
                      {tab === 'ai' ? 'AI Tutor' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Lessons tab */}
                {activeTab === 'lessons' && (
                  <div className="space-y-1">
                    {course?.sections?.map((section: any) => (
                      <div key={section.id}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-800 text-left transition-colors"
                        >
                          <p className="text-white font-medium text-sm">{section.title}</p>
                          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expandedSections.has(section.id) && 'rotate-180')} />
                        </button>
                        <AnimatePresence>
                          {expandedSections.has(section.id) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-0.5 pl-2">
                              {section.lessons?.map((lesson: any) => {
                                const lp = progressMap.get(lesson.id) as any;
                                const isActive = lesson.id === lessonId;
                                return (
                                  <Link key={lesson.id} href={`/dashboard/courses/${courseId}/learn/${lesson.id}`}>
                                    <div className={cn('flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer', isActive ? 'bg-primary/20 border border-primary/30' : 'hover:bg-gray-800')}>
                                      {lp?.isCompleted ? (
                                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      ) : (
                                        <div className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-gray-500')}>
                                          {lessonTypeIcon(lesson.type)}
                                        </div>
                                      )}
                                      <p className={cn('text-xs flex-1 line-clamp-2', isActive ? 'text-primary font-medium' : lp?.isCompleted ? 'text-gray-400' : 'text-gray-300')}>
                                        {lesson.title}
                                      </p>
                                      {lesson.duration && (
                                        <span className="text-xs text-gray-500 flex-shrink-0">{Math.round(lesson.duration / 60)}m</span>
                                      )}
                                    </div>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <div>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Take notes here... (timestamped automatically)"
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={4}
                      />
                      <button
                        onClick={() => saveNoteMutation.mutate(note)}
                        disabled={!note.trim() || saveNoteMutation.isPending}
                        className="w-full mt-2 bg-primary hover:bg-primary/90 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Save Note
                      </button>
                    </div>
                    <div className="space-y-2">
                      {notes?.map((n: any) => (
                        <div key={n.id} className="bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{formatRelativeTime(n.createdAt)}</p>
                          <p className="text-white text-sm">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discussion tab */}
                {activeTab === 'discussion' && (
                  <div className="space-y-3">
                    <div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Ask a question or share your thoughts..."
                        className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                      />
                      <button
                        onClick={() => postCommentMutation.mutate(comment)}
                        disabled={!comment.trim() || postCommentMutation.isPending}
                        className="w-full mt-2 bg-primary hover:bg-primary/90 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Post Comment
                      </button>
                    </div>
                    <div className="space-y-3">
                      {comments?.map((c: any) => (
                        <div key={c.id} className="bg-gray-800 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                              {c.user?.firstName?.[0]}{c.user?.lastName?.[0]}
                            </div>
                            <span className="text-xs text-white font-medium">{c.user?.firstName} {c.user?.lastName}</span>
                            <span className="text-xs text-gray-500">{formatRelativeTime(c.createdAt)}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Tutor tab */}
                {activeTab === 'ai' && (
                  <div className="flex flex-col h-[calc(100vh-12rem)]">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                      {aiMessages.length === 0 && (
                        <div className="text-center py-8">
                          <Bot className="w-10 h-10 text-primary mx-auto mb-3" />
                          <p className="text-white font-medium text-sm">AI Learning Assistant</p>
                          <p className="text-gray-400 text-xs mt-1">Ask me anything about this lesson!</p>
                        </div>
                      )}
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={cn('rounded-xl p-3 text-sm', msg.role === 'user' ? 'bg-primary/20 text-primary ml-4' : 'bg-gray-800 text-gray-200 mr-4')}>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendAiMessage()}
                        placeholder="Ask the AI tutor..."
                        className="flex-1 p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button onClick={sendAiMessage} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white hover:bg-primary/90 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            {currentLesson?.type === 'VIDEO' && currentLesson.videoUrl && (
              <VideoPlayer
                src={currentLesson.videoUrl}
                poster={currentLesson.thumbnailUrl}
                initialPosition={lessonProgress?.lastPosition}
                onProgress={(data) => updateProgressMutation.mutate(data)}
                onComplete={() => markCompleteMutation.mutate()}
              />
            )}

            {currentLesson?.type === 'TEXT' && currentLesson.content && (
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
            )}

            {currentLesson?.type === 'EMBED' && currentLesson.embedUrl && (
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden">
                <iframe src={currentLesson.embedUrl} className="w-full h-full" allowFullScreen />
              </div>
            )}

            <div className="mt-6">
              <h1 className="text-2xl font-bold text-white mb-2">{currentLesson?.title}</h1>
              {currentLesson?.description && (
                <p className="text-gray-400">{currentLesson.description}</p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
              {prevLesson ? (
                <Link href={`/dashboard/courses/${courseId}/learn/${prevLesson.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Previous</p>
                    <p className="text-sm font-medium">{prevLesson.title}</p>
                  </div>
                </Link>
              ) : <div />}

              {nextLesson && (
                <Link href={`/dashboard/courses/${courseId}/learn/${nextLesson.id}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Next</p>
                    <p className="text-sm font-medium">{nextLesson.title}</p>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
