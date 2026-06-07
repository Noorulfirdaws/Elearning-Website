import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../lib/api';

const TYPE_ICON: Record<string, string> = {
  ENROLLMENT: '📚', COMPLETION: '🎓', PAYMENT: '💳', ASSIGNMENT: '📝',
  QUIZ_RESULT: '✅', COMMENT: '💬', CERTIFICATE: '🏆', ANNOUNCEMENT: '📢',
};

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data || []),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data || [];
  const unread = notifications.filter((n: any) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => markAllRead.mutate()}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>{isLoading ? 'Loading…' : "You're all caught up!"}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.isRead && styles.itemUnread]}
            onPress={() => { if (!item.isRead) markRead.mutate(item.id); }}
          >
            <Text style={styles.icon}>{TYPE_ICON[item.type] || '🔔'}</Text>
            <View style={styles.content}>
              <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleBold]}>{item.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  markAll: { fontSize: 13, color: '#6366f1', fontWeight: '600' },
  list: { padding: 16, gap: 8 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  itemUnread: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1 },
  icon: { fontSize: 24, flexShrink: 0 },
  content: { flex: 1 },
  itemTitle: { fontSize: 14, color: '#374151', marginBottom: 2 },
  itemTitleBold: { fontWeight: '700', color: '#111827' },
  message: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', alignSelf: 'flex-start', marginTop: 4, flexShrink: 0 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
});
