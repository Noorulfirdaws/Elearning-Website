import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const apiInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

apiInstance.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiInstance.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as any;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken, userId } = useAuthStore.getState();
        if (!refreshToken || !userId) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { userId, refreshToken });
        useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiInstance(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  },
);

export { apiInstance as api };
export default apiInstance;

export const apiRoutes = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    mfaSetup: '/auth/mfa/setup',
    mfaConfirm: '/auth/mfa/confirm',
    google: '/auth/google',
    github: '/auth/github',
  },
  courses: {
    list: '/courses',
    featured: '/courses/featured',
    mine: '/courses/instructor/my-courses',
    instructorCourses: '/courses/instructor/my-courses',
    getBySlug: (slug: string) => `/courses/${slug}`,
    getById: (id: string) => `/courses/${id}`,
    bySlug: (slug: string) => `/courses/${slug}`,
    create: '/courses',
    update: (id: string) => `/courses/${id}`,
    delete: (id: string) => `/courses/${id}`,
    publish: (id: string) => `/courses/${id}/publish`,
    review: (id: string) => `/courses/${id}/reviews`,
  },
  enrollments: {
    enroll: (courseId: string) => `/enrollments/free/${courseId}`,
    free: (courseId: string) => `/enrollments/free/${courseId}`,
    mine: '/enrollments/my-enrollments',
    status: (courseId: string) => `/enrollments/${courseId}/status`,
    students: (courseId: string) => `/enrollments/${courseId}/students`,
  },
  progress: {
    update: (lessonId: string) => `/progress/lesson/${lessonId}`,
    course: (courseId: string) => `/progress/course/${courseId}`,
    lesson: (lessonId: string) => `/progress/lesson/${lessonId}`,
  },
  payments: {
    checkout: (courseId: string) => `/payments/stripe/checkout/${courseId}`,
    createCheckout: '/payments/stripe/checkout',
    myPayments: '/payments/my-payments',
    userPayments: '/payments/my-payments',
    validateCoupon: '/payments/coupon/validate',
  },
  certificates: {
    generate: (courseId: string) => `/certificates/${courseId}/generate`,
    mine: '/certificates/my-certificates',
    verify: (uniqueId: string) => `/certificates/verify/${uniqueId}`,
    templates: '/certificates/templates',
  },
  analytics: {
    overview: '/analytics/platform/overview',
    daily: '/analytics/platform/daily',
    instructor: '/analytics/instructor/me',
    course: (id: string) => `/analytics/course/${id}`,
  },
  community: {
    posts: '/community/posts',
    post: (id: string) => `/community/posts/${id}`,
    communities: '/community/communities',
  },
  users: {
    me: '/users/me',
    updateProfile: '/users/me',
    changePassword: '/users/me/password',
    notificationSettings: '/users/me/notifications/settings',
    getById: (id: string) => `/users/${id}`,
  },
  ai: {
    generateOutline: '/ai/course-outline',
    courseOutline: '/ai/course-outline',
    quizQuestions: '/ai/quiz-questions',
    assignment: '/ai/assignment',
    summary: '/ai/course-summary',
    chat: '/ai/chat',
    recommendations: '/ai/recommendations',
  },
  search: {
    global: '/search',
  },
  notifications: {
    mine: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
  },
  files: {
    upload: '/files/upload',
    uploadUrl: '/files/upload-url',
    delete: (id: string) => `/files/${id}`,
    myFiles: '/files/my-files',
  },
  video: {
    uploadUrl: '/video/upload-url',
    uploadStatus: (id: string) => `/video/uploads/${id}/status`,
    playbackToken: (playbackId: string) => `/video/playback-token/${playbackId}`,
  },
};
