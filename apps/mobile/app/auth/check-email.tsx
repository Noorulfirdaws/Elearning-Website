import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../lib/api';

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
      Alert.alert('Sent!', 'A new verification email has been sent.');
    } catch {
      Alert.alert('Error', 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>📧</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>📬 Didn't receive it?</Text>
          <Text style={styles.tip}>• Check your spam / junk folder</Text>
          <Text style={styles.tip}>• Make sure the email address is correct</Text>
          <Text style={styles.tip}>• Wait a minute then resend</Text>
        </View>

        <TouchableOpacity
          style={[styles.resendBtn, (resending || sent) && styles.resendDisabled]}
          onPress={resend}
          disabled={resending || sent}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" size="small" />
          ) : (
            <Text style={styles.resendText}>{sent ? '✓ Email resent!' : 'Resend verification email'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/auth/login')}>
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  emailText: { fontWeight: '700', color: '#374151' },
  tipBox: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32, borderWidth: 1, borderColor: '#fde68a' },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 8 },
  tip: { fontSize: 13, color: '#a16207', lineHeight: 22 },
  resendBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#6366f1', marginBottom: 12 },
  resendDisabled: { opacity: 0.5 },
  resendText: { fontSize: 15, color: '#6366f1', fontWeight: '700' },
  backBtn: { paddingVertical: 12 },
  backText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
});
