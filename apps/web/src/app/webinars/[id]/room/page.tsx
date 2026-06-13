'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function WebinarRoomPage() {
  const { id } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post(`/webinars/${id}/join`).then((r) => {
      setRoomUrl(r.data.data.url);
      setLoading(false);
    }).catch((err) => {
      setError(err.response?.data?.message || 'Could not join webinar.');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Joining webinar…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-xl font-semibold mb-4">❌ {error}</p>
          <a href="/webinars" className="text-emerald-400 hover:underline">Back to Webinars</a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-white font-semibold">Live Session</span>
        <span className="flex items-center gap-2 text-red-400 text-sm font-bold">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          LIVE
        </span>
        <a href="/webinars" className="text-gray-400 hover:text-white text-sm transition-colors">Leave</a>
      </div>
      {roomUrl && (
        <iframe
          ref={iframeRef}
          src={roomUrl}
          className="flex-1 w-full"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
        />
      )}
    </div>
  );
}
