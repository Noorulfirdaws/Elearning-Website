'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineLesson {
  id: string;
  title: string;
  type: string;
  videoUrl?: string;
  content?: string;
  courseId: string;
  courseTitle: string;
  downloadedAt: number;
  size?: number;
}

interface PendingRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  queuedAt: number;
}

const DB_NAME = 'lms-offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('offline-lessons'))
        db.createObjectStore('offline-lessons', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pending-requests'))
        db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('progress'))
        db.createObjectStore('progress', { keyPath: 'lessonId' });
    };
  });
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // Trigger background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          (reg as any).sync?.register('sync-lesson-progress');
        });
      }
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        setSwRegistered(true);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const downloadLesson = useCallback(async (lesson: OfflineLesson) => {
    const db = await openDB();
    const tx = db.transaction('offline-lessons', 'readwrite');
    tx.objectStore('offline-lessons').put({ ...lesson, downloadedAt: Date.now() });

    // Pre-cache video via service worker message
    if (lesson.videoUrl && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'CACHE_VIDEO', url: lesson.videoUrl });
    }
  }, []);

  const getDownloadedLessons = useCallback(async (): Promise<OfflineLesson[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-lessons', 'readonly');
      const req = tx.objectStore('offline-lessons').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const deleteOfflineLesson = useCallback(async (lessonId: string) => {
    const db = await openDB();
    const tx = db.transaction('offline-lessons', 'readwrite');
    tx.objectStore('offline-lessons').delete(lessonId);
  }, []);

  const queueProgressSync = useCallback(async (lessonId: string, progress: number, courseId: string) => {
    if (isOnline) return; // Only queue when offline

    const db = await openDB();

    // Save progress locally
    const progressTx = db.transaction('progress', 'readwrite');
    progressTx.objectStore('progress').put({ lessonId, progress, courseId, updatedAt: Date.now() });

    // Queue the API request for sync
    const reqTx = db.transaction('pending-requests', 'readwrite');
    reqTx.objectStore('pending-requests').add({
      url: `/api/v1/progress/lesson/${lessonId}`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, courseId }),
      queuedAt: Date.now(),
    });
  }, [isOnline]);

  const isLessonDownloaded = useCallback(async (lessonId: string): Promise<boolean> => {
    const db = await openDB();
    return new Promise(resolve => {
      const tx = db.transaction('offline-lessons', 'readonly');
      const req = tx.objectStore('offline-lessons').get(lessonId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  }, []);

  return {
    isOnline,
    swRegistered,
    downloadLesson,
    getDownloadedLessons,
    deleteOfflineLesson,
    queueProgressSync,
    isLessonDownloaded,
  };
}
