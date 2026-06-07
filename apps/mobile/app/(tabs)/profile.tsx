import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Settings, LogOut, Award, BookOpen, Clock, ChevronRight, Bell } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPrompt}>
          <Text style={styles.authTitle}>Sign in to view your profile</Text>
          <TouchableOpacity style={styles.authButton} onPress={() => router.push('/auth/login')}>
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    { icon: BookOpen, label: 'My Courses', onPress: () => router.push('/my-courses') },
    { icon: Award, label: 'Certificates', onPress: () => router.push('/certificates') },
    { icon: Bell, label: 'Notifications', onPress: () => router.push('/notifications') },
    { icon: Settings, label: 'Account Settings', onPress: () => router.push('/settings') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {user.firstName?.[0]}{user.lastName?.[0]}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.role === 'INSTRUCTOR' && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Instructor</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Enrolled', value: '12', icon: '📚' },
            { label: 'Completed', value: '5', icon: '✅' },
            { label: 'Certificates', value: '3', icon: '🏆' },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statEmoji}>{s.icon}</Text>
              <Text style={styles.statNum}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={item.label} style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]} onPress={item.onPress}>
              <View style={styles.menuIcon}>
                <item.icon size={20} color="#6366f1" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={18} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.version}>
          <Text style={styles.versionText}>LMS Platform v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  authTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 20 },
  authButton: { backgroundColor: '#6366f1', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  authButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#6366f1' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { color: '#6366f1', fontWeight: '600', fontSize: 12 },
  statsRow: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  menu: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f0ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
  version: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 12, color: '#9ca3af' },
});
