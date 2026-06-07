import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth';

export default function CommunityScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [postText, setPostText] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => api.get('/community/posts').then(r => r.data.data || []),
  });

  const createPost = useMutation({
    mutationFn: (content: string) => api.post('/community/posts', { content, type: 'TEXT' }),
    onSuccess: () => { setPostText(''); qc.invalidateQueries({ queryKey: ['community-posts'] }); },
  });

  const react = useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: string }) =>
      api.post(`/community/posts/${postId}/react`, { type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-posts'] }),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          data={posts || []}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>{isLoading ? 'Loading…' : 'No posts yet. Be the first!'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.post}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.author?.firstName?.[0]}{item.author?.lastName?.[0]}</Text>
                </View>
                <View>
                  <Text style={styles.authorName}>{item.author?.firstName} {item.author?.lastName}</Text>
                  <Text style={styles.postTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={styles.postContent}>{item.content}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => react.mutate({ postId: item.id, type: 'LIKE' })}>
                  <Text style={styles.actionText}>👍 {item._count?.reactions || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionText}>💬 {item._count?.comments || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListHeaderComponent={
            user ? (
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder="Share something with the community…"
                  placeholderTextColor="#9ca3af"
                  value={postText}
                  onChangeText={setPostText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.postBtn, !postText.trim() && styles.postBtnDisabled]}
                  onPress={() => postText.trim() && createPost.mutate(postText)}
                  disabled={!postText.trim() || createPost.isPending}
                >
                  <Text style={styles.postBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  list: { padding: 16, gap: 12 },
  composer: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  input: { fontSize: 14, color: '#111827', minHeight: 60, textAlignVertical: 'top', marginBottom: 10 },
  postBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  post: { backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  postTime: { fontSize: 11, color: '#9ca3af' },
  postContent: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: '#6b7280' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
