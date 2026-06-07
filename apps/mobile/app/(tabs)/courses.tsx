import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Search, Filter, Star, BookOpen } from 'lucide-react-native';
import { useState } from 'react';
import { api } from '../../lib/api';

const CATEGORIES = ['All', 'Development', 'Design', 'Marketing', 'Business', 'Data Science'];

export default function CoursesScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['courses', search, category],
    queryFn: () => api.get('/courses', { params: { search: search || undefined, category: category !== 'All' ? category : undefined, limit: 20 } }).then(r => r.data.data),
    staleTime: 30_000,
  });

  const courses = data?.courses || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Courses</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Course list */}
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <BookOpen size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          )
        }
        renderItem={({ item: course }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/course/${course.id}`)}>
            {course.thumbnail ? (
              <Image source={{ uri: course.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.thumbPlaceholder]}>
                <BookOpen size={32} color="#9ca3af" />
              </View>
            )}
            <View style={styles.info}>
              <View style={styles.badgeRow}>
                {course.level && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{course.level}</Text>
                  </View>
                )}
                {course.isFree && (
                  <View style={[styles.badge, styles.badgeFree]}>
                    <Text style={[styles.badgeText, styles.badgeFreeText]}>Free</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{course.title}</Text>
              <Text style={styles.instructor} numberOfLines={1}>
                {course.instructor?.firstName} {course.instructor?.lastName}
              </Text>
              <View style={styles.ratingRow}>
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.rating}>{(course.rating || 0).toFixed(1)}</Text>
                <Text style={styles.reviews}>({course.totalStudents || 0})</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {course.isFree ? 'Free' : `$${(course.price / 100).toFixed(2)}`}
                </Text>
                {course.originalPrice && course.originalPrice > course.price && (
                  <Text style={styles.originalPrice}>${(course.originalPrice / 100).toFixed(2)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 48, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  categoryScroll: { maxHeight: 44 },
  categoryContent: { paddingHorizontal: 20, gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  chipTextActive: { color: '#fff' },
  list: { padding: 20, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, flexDirection: 'row' },
  thumbnail: { width: 110, height: 90 },
  thumbPlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f3f4f6' },
  badgeFree: { backgroundColor: '#d1fae5' },
  badgeText: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  badgeFreeText: { color: '#065f46' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  instructor: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  rating: { fontSize: 11, fontWeight: '600', color: '#f59e0b' },
  reviews: { fontSize: 11, color: '#9ca3af' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  originalPrice: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
