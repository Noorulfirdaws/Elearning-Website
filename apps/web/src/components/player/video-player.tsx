'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Captions, BookmarkPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  hlsUrl?: string;
  poster?: string;
  onProgress?: (data: { watchPercentage: number; timeWatched: number; lastPosition: number }) => void;
  onComplete?: () => void;
  initialPosition?: number;
}

export function VideoPlayer({ src, hlsUrl, poster, onProgress, onComplete, initialPosition = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout>();

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
  const hideControlsTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoSrc = hlsUrl || src;

    if (Hls.isSupported() && videoSrc.includes('.m3u8')) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else {
      video.src = videoSrc;
    }

    if (initialPosition > 0) {
      video.currentTime = initialPosition;
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [src, hlsUrl, initialPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(0) / video.duration) * 100);
      }
    };

    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => { setVolume(video.volume); setIsMuted(video.muted); };

    const handleEnded = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  useEffect(() => {
    if (!onProgress || duration === 0) return;
    progressTimerRef.current = setInterval(() => {
      if (isPlaying && videoRef.current) {
        onProgress({
          watchPercentage: (currentTime / duration) * 100,
          timeWatched: Math.round(currentTime),
          lastPosition: Math.round(currentTime),
        });
      }
    }, 10000);
    return () => clearInterval(progressTimerRef.current);
  }, [isPlaying, currentTime, duration, onProgress]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    isPlaying ? video.pause() : video.play();
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    video.currentTime = ratio * duration;
  }, [duration]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Number(e.target.value);
    if (Number(e.target.value) === 0) video.muted = true;
    else video.muted = false;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!isFullscreen) container.requestFullscreen();
    else document.exitFullscreen();
    setIsFullscreen(!isFullscreen);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full aspect-video"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        playsInline
        preload="metadata"
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20" onClick={togglePlay}>
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-gray-900 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={cn('absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300', showControls ? 'opacity-100' : 'opacity-0')}>
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white text-xs font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1 relative h-1 bg-white/30 rounded-full cursor-pointer group/progress" onClick={handleSeek}>
            <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${buffered}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }} />
          </div>
          <span className="text-white text-xs font-mono">{formatTime(duration)}</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => skip(-10)} className="text-white hover:text-primary transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={togglePlay} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={() => skip(10)} className="text-white hover:text-primary transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback speed */}
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)} className="text-white text-xs font-medium bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors">
                {playbackRate}x
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                  {rates.map((r) => (
                    <button
                      key={r}
                      onClick={() => { videoRef.current!.playbackRate = r; setPlaybackRate(r); setShowSettings(false); }}
                      className={cn('block w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white', playbackRate === r && 'text-primary font-semibold')}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="text-white hover:text-primary transition-colors">
              <Captions className="w-5 h-5" />
            </button>

            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
