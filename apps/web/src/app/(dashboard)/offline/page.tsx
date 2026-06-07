'use client';

import { useEffect, useState } from 'react';
import { useOffline } from '@/hooks/use-offline';
import { formatDistanceToNow } from 'date-fns';

export default function OfflineDownloadsPage() {
  const { getDownloadedLessons, deleteOfflineLesson, isOnline } = useOffline();
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    getDownloadedLessons().then(setLessons);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteOfflineLesson(id);
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  const totalSize = lessons.reduce((acc, l) => acc + (l.size || 0), 0);
  const formatBytes = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Offline Downloads</h1>
        <p className="text-gray-500 mt-1">Lessons available without internet connection.</p>
      </div>

      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${isOnline ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
        {isOnline ? 'Online — changes will sync automatically' : 'Offline mode — progress saved locally'}
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📥</div>
          <p className="text-gray-400 text-lg">No downloads yet.</p>
          <p className="text-gray-400 text-sm mt-1">Open a lesson and click "Download for Offline" to save it.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
            <span>{lessons.length} lesson{lessons.length !== 1 ? 's' : ''} downloaded</span>
            <span>{formatBytes(totalSize)} used</span>
          </div>
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{lesson.type === 'VIDEO' ? '🎬' : '📄'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-400">{lesson.courseTitle}</p>
                  <p className="text-xs text-gray-400">
                    Downloaded {formatDistanceToNow(new Date(lesson.downloadedAt), { addSuffix: true })}
                    {lesson.size ? ` · ${formatBytes(lesson.size)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(lesson.id)}
                  className="text-red-400 hover:text-red-600 transition-colors text-sm font-medium flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
