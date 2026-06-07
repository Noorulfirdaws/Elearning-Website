import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { api } from '../../lib/api';

export default function RegisterScreen() {
  const { setUser, setTokens } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.'); return;
    }
    if (form.password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.'); return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      const { accessToken, refreshToken, user } = res.data.data;
      setTokens(accessToken, refreshToken);
      setUser(user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.response?.data?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
          <View style={styles.logoSection}>
            <View style={styles.logo}><Text style={styles.logoText}>LMS</Text></View>
            <Text style={styles.tagline}>Create your account</Text>
          </View>

          <View style={styles.form}>
            {[
              { label: 'First Name', key: 'firstName', placeholder: 'Jane', keyboard: 'default' },
              { label: 'Last Name', key: 'lastName', placeholder: 'Doe', keyboard: 'default' },
              { label: 'Email', key: 'email', placeholder: 'jane@example.com', keyboard: 'email-address' },
              { label: 'Password', key: 'password', placeholder: 'Min. 8 characters', keyboard: 'default', secure: true },
            ].map((field) => (
              <View key={field.key} style={styles.field}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9ca3af"
                  keyboardType={field.keyboard as any}
                  autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                  secureTextEntry={field.secure}
                  value={form[field.key as keyof typeof form]}
                  onChangeText={set(field.key as keyof typeof form)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { paddingHorizontal: 24, paddingVertical: 32 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  tagline: { fontSize: 16, color: '#6b7280' },
  form: { backgroundColor: '#f9fafb', borderRadius: 24, padding: 24, marginBottom: 24 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#111827', borderWidth: 1.5, borderColor: '#e5e7eb' },
  submitButton: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginLink: { fontSize: 14, color: '#6366f1', fontWeight: '700' },
});
