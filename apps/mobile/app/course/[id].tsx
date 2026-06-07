import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Star, Users, Clock, Play, Lock, CheckCircle2 } from 'lucide-react-native';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then(r => r.data.data),
  });

  const enrollMutation = useMutation({
    mutationFn: () => api.post(`/enrollments`, { courseId: id }),
    onSuccess: () => {
      Alert.alert('Enrolled!', 'You are now enrolled in this course.', [
        { text: 'Start Learning', onPress: () => router.push(`/learn/${course.sections?.[0]?.lessons?.[0]?.id}`) },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Enrollment failed');
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>
      </SafeAreaView>
    );
  }

  const isEnrolled = course?.isEnrolled;
  const isFree = course?.isFree || course?.price === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header image */}
        <View style={styles.imageContainer}>
          {course?.thumbnail ? (
            <Image source={{ uri: course.thumbnail }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.imagePlaceholder]} />
          )}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title + meta */}
          <Text style={styles.title}>{course?.title}</Text>
          <Text style={styles.subtitle} numberOfLines={3}>{course?.shortDescription}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.metaText}>{(course?.rating || 0).toFixed(1)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Users size={14} color="#6b7280" />
              <Text style={styles.metaText}>{course?.totalStudents || 0} students</Text>
            </View>
            {course?.duration && (
              <View style={styles.metaItem}>
                <Clock size={14} color="#6b7280" />
                <Text style={styles.metaText}>{Math.round(course.duration / 60)}h</Text>
              </View>
            )}
          </View>

          {/* Instructor */}
          {course?.instructor && (
            <View style={styles.instructor}>
              <View style={styles.instructorAvatar}>
                <Text style={styles.instructorInitials}>
                  {course.instructor.firstName?.[0]}{course.instructor.lastName?.[0]}
                </Text>
              </View>
              <View>
                <Text style={styles.instructorName}>{course.instructor.firstName} {course.instructor.lastName}</Text>
                <Text style={styles.instructorRole}>Instructor</Text>
              </View>
            </View>
          )}

          {/* CTA */}
          {isEnrolled ? (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                const firstLesson = course?.sections?.[0]?.lessons?.[0];
                if (firstLesson) router.push(`/learn/${firstLesson.id}`);
              }}
            >
              <Play size={20} color="#fff" fill="#fff" />
              <Text style={styles.ctaText}>Continue Learning</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.price}>
                {isFree ? 'Free' : `$${(course?.price / 100).toFixed(2)}`}
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => {
                  if (!user) {
                    Alert.alert('Sign in required', 'Please sign in to enroll.', [
                      { text: 'Sign In', onPress: () => router.push('/auth/login') },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                    return;
                  }
                  if (isFree) {
                    enrollMutation.mutate();
                  } else {
                    router.push(`/checkout/${id}`);
                  }
                }}
                disabled={enrollMutation.isPending}
              >
                <Text style={styles.ctaText}>{isFree ? 'Enroll for Free' : 'Buy Now'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Curriculum */}
          {course?.sections && course.sections.length > 0 && (
            <View style={styles.curriculum}>
              <Text style={styles.sectionHeading}>Course Content</Text>
              {course.sections.map((section: any) => (
                <View key={section.id} style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {section.lessons?.map((lesson: any) => (
                    <TouchableOpacity
                      key={lesson.id}
                      style={styles.lessonRow}
                      onPress={() => {
                        if (isEnrolled || lesson.isPreview) {
                          router.push(`/learn/${lesson.id}`);
                        }
                      }}
                    >
                      {isEnrolled || lesson.isPreview ? (
                        <Play size={14} color="#6366f1" />
                      ) : (
                        <Lock size={14} color="#9ca3af" />
                      )}
                      <Text style={[styles.lessonTitle, !isEnrolled && !lesson.isPreview && styles.lessonLocked]}>
                        {lesson.title}
                      </Text>
                      {lesson.isPreview && (
                        <View style={styles.previewBadge}>
                          <Text style={styles.previewText}>Preview</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { position: 'relative' },
  headerImage: { width: '100%', height: 220 },
  imagePlaceholder: { backgroundColor: '#e5e7eb' },
  backBtn: { position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 16 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#6b7280' },
  instructor: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, backgroundColor: '#fff', padding: 14, borderRadius: 14 },
  instructorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  instructorInitials: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  instructorName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  instructorRole: { fontSize: 12, color: '#6b7280' },
  price: { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12 },
  ctaButton: { backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  curriculum: { marginTop: 8 },
  sectionHeading: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  lessonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  lessonTitle: { flex: 1, fontSize: 14, color: '#374151' },
  lessonLocked: { color: '#9ca3af' },
  previewBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  previewText: { fontSize: 10, color: '#6366f1', fontWeight: '600' },
});
