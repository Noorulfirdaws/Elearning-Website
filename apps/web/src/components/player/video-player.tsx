'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src?: string;
  youtubeUrl?: string;
  videoUrl?: string;       // alias — checked if src is empty
  poster?: string;
  onProgress?: (data: { watchPercentage: number; timeWatched: number; lastPosition: number }) => void;
  onComplete?: () => void;
  initialPosition?: number;
}

// Extract YouTube video ID from any YouTube URL
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

// ── YouTube Embed Player ────────────────────────────────────────────────────
function YouTubePlayer({ url, onComplete }: { url: string; onComplete?: () => void }) {
  const videoId = getYouTubeId(url);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!videoId) return;

    // Listen for YouTube iframe API messages
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // YT iframe API: info.playerState === 0 means ended
        if (data?.event === 'infoDelivery' && data?.info?.playerState === 0 && !ended) {
          setEnded(true);
          onComplete?.();
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoId, onComplete, ended]);

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <p className="text-white/60 text-sm">Invalid YouTube URL</p>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&autoplay=0`;

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="Course Video"
      />
    </div>
  );
}

// ── Native Video Player ─────────────────────────────────────────────────────
function NativePlayer({ src, poster, onProgress, onComplete, initialPosition = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout>();
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [buffered, setBuffered] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.src = src;
    if (initialPosition > 0) video.currentTime = initialPosition;
  }, [src, initialPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) setBuffered((video.buffered.end(0) / video.duration) * 100);
    };
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolume = () => { setVolume(video.volume); setIsMuted(video.muted); };
    const onEnded = () => { setIsPlaying(false); onComplete?.(); };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolume);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolume);
      video.removeEventListener('ended', onEnded);
    };
  }, [onComplete]);

  useEffect(() => {
    if (!onProgress || duration === 0) return;
    progressTimerRef.current = setInterval(() => {
      if (isPlaying && videoRef.current) {
        onProgress({ watchPercentage: (currentTime / duration) * 100, timeWatched: Math.round(currentTime), lastPosition: Math.round(currentTime) });
      }
    }, 10000);
    return () => clearInterval(progressTimerRef.current);
  }, [isPlaying, currentTime, duration, onProgress]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }, [duration]);

  const skip = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s));
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
    setIsFullscreen(!isFullscreen);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (isPlaying) hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const fmt = (t: number) => {
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  };

  return (
    <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden"
      onMouseMove={handleMouseMove} onMouseLeave={() => isPlaying && setShowControls(false)}>
      <video ref={videoRef} poster={poster} className="w-full aspect-video" onClick={togglePlay} playsInline preload="metadata" />

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer" onClick={togglePlay}>
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-gray-900 fill-current ml-1" />
          </div>
        </div>
      )}

      <div className={cn('absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0')}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white text-xs font-mono">{fmt(currentTime)}</span>
          <div className="flex-1 relative h-1 bg-white/30 rounded-full cursor-pointer" onClick={handleSeek}>
            <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${buffered}%` }} />
            <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
          <span className="text-white text-xs font-mono">{fmt(duration)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => skip(-10)} className="text-white hover:text-indigo-400 transition-colors"><SkipBack className="w-5 h-5" /></button>
            <button onClick={togglePlay} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={() => skip(10)} className="text-white hover:text-indigo-400 transition-colors"><SkipForward className="w-5 h-5" /></button>
            <button onClick={() => { const v = videoRef.current; if (v) v.muted = !isMuted; }} className="text-white hover:text-indigo-400 transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
              onChange={e => { const v = videoRef.current; if (v) { v.volume = Number(e.target.value); v.muted = Number(e.target.value) === 0; } }}
              className="w-20 h-1 accent-indigo-500 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className="text-white text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors">{playbackRate}x</button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                    <button key={r} onClick={() => { if (videoRef.current) videoRef.current.playbackRate = r; setPlaybackRate(r); setShowSettings(false); }}
                      className={cn('block w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white', playbackRate === r && 'text-indigo-400 font-semibold')}>
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Smart VideoPlayer — auto-detects YouTube vs native ──────────────────────
export function VideoPlayer({ src, youtubeUrl, videoUrl, poster, onProgress, onComplete, initialPosition }: VideoPlayerProps) {
  const url = youtubeUrl || videoUrl || src || '';

  if (!url) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <p className="text-white/50 text-sm">No video source provided</p>
      </div>
    );
  }

  if (isYouTubeUrl(url)) {
    return <YouTubePlayer url={url} onComplete={onComplete} />;
  }

  return <NativePlayer src={url} poster={poster} onProgress={onProgress} onComplete={onComplete} initialPosition={initialPosition} />;
}
