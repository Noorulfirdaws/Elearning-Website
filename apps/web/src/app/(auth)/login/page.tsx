'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, Github, Chrome, Loader2, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { parseApiError } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  mfaCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { setUser, setTokens } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post(apiRoutes.auth.login, data);
      const result = res.data.data;

      if (result.requiresMfa) {
        setRequiresMfa(true);
        return;
      }

      setUser(result.user);
      setTokens(result.accessToken, result.refreshToken);

      toast.success(`Bon retour, ${result.user.firstName} !`);

      const role = result.user.role;
      // Si l'élève venait d'un chapitre payant → on le ramène au chapitre
      if (redirectTo && role === 'STUDENT') {
        router.push(redirectTo);
      } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'INSTRUCTOR') {
        router.push('/instructor');
      } else {
        router.push(redirectTo || '/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        toast.error('Verifie d\'abord ton adresse e-mail. Un nouveau lien a été envoyé !');
        router.push(`/check-email?email=${encodeURIComponent(data.email)}`);
        return;
      }
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-white/10 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
          ))}
        </div>
        <div className="relative text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Bon retour ! 🇩🇯</h2>
          <p className="text-blue-100 text-lg max-w-sm">
            Continue ton parcours scolaire. Tu es à un pas de tes objectifs.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              { label: 'Niveaux disponibles', value: '7' },
              { label: 'Matières', value: '38' },
              { label: 'Chapitres complets', value: '100+' },
              { label: 'Satisfaction', value: '98%' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-blue-200 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              LearnHub
            </Link>
            <h1 className="text-3xl font-bold">Se connecter</h1>
            <p className="text-muted-foreground mt-2">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-primary font-medium hover:underline">S'inscrire</Link>
            </p>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-3 text-muted-foreground">continuer avec l'e-mail</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="toi@exemple.com"
                  className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Mot de passe</label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">Mot de passe oublié ?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>

            {requiresMfa && (
              <div>
                <label className="text-sm font-medium block mb-1.5">Code MFA</label>
                <input
                  {...register('mfaCode')}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm text-center tracking-widest text-lg"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Se connecter'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
