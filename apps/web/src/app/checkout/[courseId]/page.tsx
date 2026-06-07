'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import axios, { apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Course {
  id: string; title: string; thumbnail?: string;
  price: number; comparePrice?: number;
  instructor: { firstName: string; lastName: string };
}

function CheckoutForm({ course }: { course: Course }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ discount: number; code: string } | null>(null);

  const applyCoupon = async () => {
    try {
      const { data } = await axios.post(apiRoutes.payments.validateCoupon, { code: coupon, courseId: course.id });
      setCouponApplied({ discount: data.data.discount, code: coupon });
      toast.success(`Coupon applied! ${data.data.discount}% off`);
    } catch {
      toast.error('Invalid coupon code');
    }
  };

  const finalPrice = couponApplied
    ? course.price * (1 - couponApplied.discount / 100)
    : course.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { data } = await axios.post(apiRoutes.payments.checkout(course.id), {
        couponCode: couponApplied?.code,
      });

      const result = await stripe.redirectToCheckout({ sessionId: data.data.sessionId });
      if (result.error) toast.error(result.error.message);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold">Order Summary</h3>
        <div className="flex items-center gap-3">
          {course.thumbnail && (
            <img src={course.thumbnail} className="w-16 h-12 rounded object-cover" alt="" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{course.title}</p>
            <p className="text-xs text-muted-foreground">
              {course.instructor.firstName} {course.instructor.lastName}
            </p>
          </div>
          <p className="font-bold">{formatCurrency(course.price)}</p>
        </div>

        {/* Coupon */}
        <div className="flex gap-2 pt-2 border-t">
          <input
            value={coupon}
            onChange={e => setCoupon(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={applyCoupon}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Apply
          </button>
        </div>

        {couponApplied && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Discount ({couponApplied.discount}%)</span>
            <span className="text-green-600">-{formatCurrency(course.price - finalPrice)}</span>
          </div>
        )}

        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Total</span>
          <span>{formatCurrency(finalPrice)}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" /> Secure Payment
        </h3>
        <div className="border rounded-lg p-3 bg-muted/30">
          <CardElement options={{
            style: {
              base: { fontSize: '16px', color: '#1a1a1a', '::placeholder': { color: '#9ca3af' } },
            },
          }} />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" />
            Complete Purchase — {formatCurrency(finalPrice)}
          </>
        )}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        30-day money-back guarantee. Secure checkout powered by Stripe.
      </p>
    </form>
  );
}

export default function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course-checkout', courseId],
    queryFn: () => axios.get(apiRoutes.courses.getById(courseId)).then(r => r.data.data),
  });

  if (isLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-lg mx-auto px-4">
        <Link href={`/courses/${courseId}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>

        <h1 className="text-2xl font-bold mb-8">Checkout</h1>

        <Elements stripe={stripePromise}>
          <CheckoutForm course={course} />
        </Elements>
      </div>
    </div>
  );
}
