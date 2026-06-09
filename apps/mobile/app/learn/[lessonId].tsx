import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useRef, useCallback } from 'react';
import Video, { OnProgressData, OnLoadData } from 'react-native-video';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, CheckCircle2 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { api } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16;

// Extract YouTube video ID from any YouTube URL
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

export default function LessonPlayerScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<any>(null);

  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [completed, setCompleted] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => api.get(`/lessons/${lessonId}`).then(r => r.data.data),
  });

  const progressMutation = useMutation({
    mutationFn: (pct: number) => api.patch(`/progress/lesson/${lessonId}`, { progress: pct }),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.post(`/progress/lesson/${lessonId}/complete`),
    onSuccess: () => setCompleted(true),
  });

  const onProgress = useCallback((data: OnProgressData) => {
    const pct = Math.round((data.currentTime / data.seekableDuration) * 100);
    setProgress(data.currentTime);

    // Auto-complete at 90%
    if (pct >= 90 && !completed) {
      completeMutation.mutate();
    }

    // Save progress every 10 seconds
    if (Math.floor(data.currentTime) % 10 === 0) {
      progressMutation.mutate(pct);
    }
  }, [completed]);

  const onLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const seek = (delta: number) => {
    videoRef.current?.seek(Math.max(0, progress + delta));
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isVideo = lesson?.type === 'VIDEO';
  const isText = lesson?.type === 'TEXT';
  const isQuiz = lesson?.type === 'QUIZ';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{lesson?.title}</Text>
        {completed && <CheckCircle2 size={20} color="#10b981" />}
      </View>

      {isVideo && lesson?.videoUrl && (() => {
        const youtubeId = getYouTubeId(lesson.videoUrl);
        if (youtubeId || isYouTubeUrl(lesson.videoUrl)) {
          const vid = youtubeId || '';
          const embedUrl = `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1&playsinline=1`;
          return (
            <View style={styles.videoContainer}>
              <WebView
                source={{ uri: embedUrl }}
                style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                onMessage={(e) => {
                  try {
                    const d = JSON.parse(e.nativeEvent.data);
                    if (d?.event === 'infoDelivery' && d?.info?.playerState === 0 && !completed) {
                      completeMutation.mutate();
                    }
                  } catch {}
                }}
              />
            </View>
          );
        }
        // Native video (direct URL / HLS)
        return (
          <View style={styles.videoContainer}>
            <TouchableOpacity activeOpacity={1} onPress={() => setShowControls(!showControls)} style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                source={{ uri: lesson.videoUrl }}
                style={styles.video}
                resizeMode="contain"
                paused={paused}
                onProgress={onProgress}
                onLoad={onLoad}
                progressUpdateInterval={1000}
              />
              {showControls && (
                <View style={styles.controls}>
                  <TouchableOpacity onPress={() => seek(-10)}>
                    <SkipBack size={28} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.playBtn} onPress={() => setPaused(!paused)}>
                    {paused ? <Play size={32} color="#fff" fill="#fff" /> : <Pause size={32} color="#fff" fill="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => seek(10)}>
                    <SkipForward size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: duration ? `${(progress / duration) * 100}%` : '0%' }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(progress)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        );
      })()}

      {isText && (
        <ScrollView style={styles.textContent} contentContainerStyle={styles.textInner}>
          <Text style={styles.lessonTitle}>{lesson?.title}</Text>
          <Text style={styles.lessonBody}>{lesson?.content}</Text>
          <TouchableOpacity style={styles.completeBtn} onPress={() => completeMutation.mutate()}>
            <Text style={styles.completeBtnText}>Mark as Complete</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {isQuiz && lesson?.quizId && (
        <View style={styles.quizPrompt}>
          <Text style={styles.quizTitle}>Quiz: {lesson.title}</Text>
          <Text style={styles.quizDesc}>Test your knowledge with this quiz.</Text>
          <TouchableOpacity style={styles.completeBtn} onPress={() => router.push(`/quiz/${lesson.quizId}`)}>
            <Text style={styles.completeBtnText}>Start Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lesson info */}
      {isVideo && (
        <ScrollView style={styles.lessonInfo} contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.lessonTitle}>{lesson?.title}</Text>
          {lesson?.description && <Text style={styles.lessonDesc}>{lesson.description}</Text>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  videoContainer: { backgroundColor: '#000' },
  videoWrapper: { width: SCREEN_WIDTH, height: (SCREEN_WIDTH * 9) / 16, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  controls: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 32, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 16 },
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 2 },
  progressFill: { height: 3, backgroundColor: '#6366f1' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6 },
  timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  textContent: { flex: 1, backgroundColor: '#fff' },
  textInner: { padding: 24 },
  lessonTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  lessonDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  lessonInfo: { flex: 1 },
  lessonBody: { fontSize: 15, color: '#374151', lineHeight: 26 },
  completeBtn: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quizPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  quizTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8, textAlign: 'center' },
  quizDesc: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 32, textAlign: 'center' },
});
