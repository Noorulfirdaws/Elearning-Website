'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Lock, Bell, CreditCard, Shield, Camera } from 'lucide-react';
import axios, { apiRoutes } from '@/lib/api';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type Tab = typeof TABS[number]['id'];

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Account Settings</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <nav className="md:col-span-1">
            <ul className="space-y-1">
              {TABS.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="md:col-span-3 border rounded-xl p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'password' && <PasswordTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'security' && <SecurityTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    timezone: user?.timezone || 'UTC',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.patch(apiRoutes.users.updateProfile, form);
      setUser(data.data);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-lg">Profile Information</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <button className="flex items-center gap-2 text-sm border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
          <Camera className="h-4 w-4" /> Change Photo
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">First Name</label>
          <input
            value={form.firstName}
            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Last Name</label>
          <input
            value={form.lastName}
            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Bio</label>
        <textarea
          rows={3}
          value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Tell students about yourself..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Email</label>
        <input
          value={user?.email}
          disabled
          className="w-full border rounded-lg px-3 py-2 text-sm bg-muted cursor-not-allowed"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function PasswordTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await axios.patch(apiRoutes.users.changePassword, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-lg">Change Password</h2>
      {['currentPassword', 'newPassword', 'confirmPassword'].map(field => (
        <div key={field}>
          <label className="block text-sm font-medium mb-1.5 capitalize">
            {field.replace(/([A-Z])/g, ' $1').trim()}
          </label>
          <input
            type="password"
            value={(form as any)[field]}
            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      ))}
      <button
        onClick={save}
        disabled={saving}
        className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
      >
        {saving ? 'Saving...' : 'Change Password'}
      </button>
    </div>
  );
}

function NotificationsTab() {
  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => axios.get(apiRoutes.users.notificationSettings).then(r => r.data.data),
  });
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setPrefs(settings);
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(apiRoutes.users.notificationSettings, prefs);
      toast.success('Preferences saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const toggles = [
    { key: 'emailEnrollment', label: 'Enrollment confirmations', desc: 'Email when you enroll in a course' },
    { key: 'emailProgress', label: 'Progress updates', desc: 'Weekly progress summary' },
    { key: 'emailCertificate', label: 'Certificate earned', desc: 'Email when you earn a certificate' },
    { key: 'emailMarketing', label: 'Promotions', desc: 'Deals and new course announcements' },
    { key: 'pushAll', label: 'Push notifications', desc: 'In-app notifications for all activity' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-lg">Notification Preferences</h2>
      <div className="space-y-4">
        {toggles.map(t => (
          <label key={t.key} className="flex items-start justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
            <div
              onClick={() => setPrefs(p => ({ ...p, [t.key]: !p[t.key] }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                prefs[t.key] ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                prefs[t.key] ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-70"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}

function BillingTab() {
  const { data: payments } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => axios.get(apiRoutes.payments.userPayments).then(r => r.data.data),
  });

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-lg">Billing History</h2>
      {payments?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {payments?.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{p.course?.title || 'Course'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">${(p.amount / 100).toFixed(2)}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  p.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SecurityTab() {
  const [mfaLoading, setMfaLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const { user } = useAuthStore();

  const setupMfa = async () => {
    setMfaLoading(true);
    try {
      const { data } = await axios.get(apiRoutes.auth.mfaSetup);
      setQrCode(data.data.qrCode);
      setSecret(data.data.secret);
    } finally { setMfaLoading(false); }
  };

  const confirmMfa = async () => {
    try {
      await axios.post(apiRoutes.auth.mfaConfirm, { token });
      toast.success('MFA enabled successfully');
      setQrCode(null);
    } catch { toast.error('Invalid token'); }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-semibold text-lg">Two-Factor Authentication</h2>
      <p className="text-sm text-muted-foreground">
        Add an extra layer of security to your account.
      </p>
      {!qrCode ? (
        <button
          onClick={setupMfa}
          disabled={mfaLoading}
          className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-70"
        >
          <Shield className="h-4 w-4" />
          {user?.mfaEnabled ? 'Reconfigure 2FA' : 'Enable 2FA'}
        </button>
      ) : (
        <div className="space-y-4 border rounded-xl p-4">
          <p className="text-sm">Scan this QR code with your authenticator app:</p>
          <img src={qrCode} alt="QR Code" className="w-40 h-40" />
          <p className="text-xs text-muted-foreground">Or enter manually: <code className="bg-muted px-1 rounded">{secret}</code></p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={confirmMfa}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              Verify
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
