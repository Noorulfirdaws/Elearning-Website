import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { PlayCircle, ChevronRight, TrendingUp, Star } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';

export default function HomeScreen() {
  const { user } = useAuthStore();

  const { data: enrollments, refetch, isRefreshing } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => api.get('/enrollments/my-enrollments').then(r => r.data.data),
    enabled: !!user,
  });

  const { data: featured } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => api.get('/courses/featured').then(r => r.data.data),
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={!!isRefreshing} onRefresh={refetch} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>{user?.firstName || 'Learner'} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Text style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Continue Learning */}
        {enrollments && enrollments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Learning</Text>
              <TouchableOpacity onPress={() => router.push('/courses')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {enrollments.slice(0, 5).map((e: any) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.courseCard}
                  onPress={() => router.push(`/learn/${e.courseId}`)}
                >
                  {e.course?.thumbnail ? (
                    <Image source={{ uri: e.course.thumbnail }} style={styles.courseThumbnail} />
                  ) : (
                    <View style={[styles.courseThumbnail, styles.thumbnailPlaceholder]} />
                  )}
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseTitle} numberOfLines={2}>{e.course?.title}</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${e.progress || 0}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{e.progress || 0}% complete</Text>
                  </View>
                  <View style={styles.playButton}>
                    <PlayCircle size={20} color="#6366f1" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Courses', value: enrollments?.length || 0, icon: '📚' },
            { label: 'Hours', value: '12h', icon: '⏱️' },
            { label: 'Streak', value: '5 days', icon: '🔥' },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Featured Courses */}
        {featured && featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Explore Courses</Text>
              <TouchableOpacity onPress={() => router.push('/courses')}>
                <Text style={styles.seeAll}>Browse all</Text>
              </TouchableOpacity>
            </View>

            {featured.slice(0, 4).map((course: any) => (
              <TouchableOpacity
                key={course.id}
                style={styles.listCard}
                onPress={() => router.push(`/courses/${course.slug}`)}
              >
                {course.thumbnail && (
                  <Image source={{ uri: course.thumbnail }} style={styles.listThumbnail} />
                )}
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.listInstructor}>
                    {course.instructor?.firstName} {course.instructor?.lastName}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Star size={12} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.rating}>{course.rating?.toFixed(1)}</Text>
                    <Text style={styles.students}>• {course.totalStudents} students</Text>
                  </View>
                  <Text style={styles.price}>
                    {course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  horizontalScroll: { paddingLeft: 20 },
  courseCard: { width: 200, backgroundColor: '#fff', borderRadius: 16, marginRight: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  courseThumbnail: { width: '100%', height: 100, borderRadius: 10, marginBottom: 8 },
  thumbnailPlaceholder: { backgroundColor: '#e5e7eb' },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 4 },
  progressFill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  progressText: { fontSize: 11, color: '#6b7280' },
  playButton: { alignSelf: 'flex-end', marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  listCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  listThumbnail: { width: 80, height: 60, borderRadius: 8, marginRight: 12 },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  listInstructor: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  rating: { fontSize: 11, color: '#f59e0b', fontWeight: '600' },
  students: { fontSize: 11, color: '#9ca3af' },
  price: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
});
