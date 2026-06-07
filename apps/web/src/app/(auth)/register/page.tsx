'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, Github, Chrome, Loader2, User, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api, apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { parseApiError } from '@/lib/utils';

const schema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser, setTokens } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword, ...payload } = data;
      const res = await api.post(apiRoutes.auth.register, payload);
      const result = res.data.data;

      if (result.requiresVerification) {
        toast.success('Account created! Please check your email to verify.');
        router.push(`/check-email?email=${encodeURIComponent(data.email)}`);
      } else {
        setUser(result.user);
        setTokens(result.accessToken, result.refreshToken);
        toast.success('Account created! Welcome to LearnHub!');
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(parseApiError(err));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-indigo-600 to-purple-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="relative text-center text-white max-w-md">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Start your journey</h2>
          <p className="text-indigo-100 text-lg leading-relaxed">
            Join 2 million learners. Get access to 15,000+ expert-led courses and build skills that employers love.
          </p>
          <div className="mt-12 space-y-4 text-left">
            {['Access 15,000+ courses for free', 'AI-powered learning assistant', 'Verified certificates', 'Join a community of 2M+ learners'].map((f) => (
              <div key={f} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-indigo-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              LearnHub
            </Link>
            <h1 className="text-3xl font-bold">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`} className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <Chrome className="w-5 h-5 text-red-500" /> Google
            </a>
            <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/github`} className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
              <Github className="w-5 h-5" /> GitHub
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-sm"><span className="bg-background px-3 text-muted-foreground">or sign up with email</span></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">First name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input {...register('firstName')} placeholder="John" className="w-full pl-9 pr-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                {errors.firstName && <p className="text-destructive text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Last name</label>
                <input {...register('lastName')} placeholder="Doe" className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                {errors.lastName && <p className="text-destructive text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input {...register('email')} type="email" placeholder="you@example.com" className="w-full pl-10 pr-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5">Confirm password</label>
              <input {...register('confirmPassword')} type="password" placeholder="••••••••" className="w-full px-4 py-3 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create account'}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
