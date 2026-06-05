'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Inner() {
  const search = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    const token = search.get('token') || '';
    const plan = (search.get('plan') || '') as any;
    const months = Number(search.get('months') || '0');
    const amount = Number(search.get('amount') || '0');
    // Moyasar appends ?id=...&status=paid|failed
    const status = (search.get('status') || search.get('mode') === 'test' ? 'paid' : 'failed');

    if (!token || !plan || !months) {
      setState('failed');
      setReason('Invalid callback');
      return;
    }

    api
      .post('/service-subscriptions/payment-callback', {
        token,
        plan,
        months,
        amount,
        status,
      })
      .then((r: any) => {
        if (r?.ok) {
          setState('success');
          toast.success('تم تفعيل الاشتراك بنجاح');
          setTimeout(() => router.replace('/subscription'), 2500);
        } else {
          setState('failed');
          setReason(r?.reason || 'تعذّر تأكيد الدفع');
        }
      })
      .catch(() => {
        setState('failed');
        setReason('فشل الاتصال بالخادم');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          {state === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="font-bold text-lg">جارٍ تأكيد الدفع...</h1>
              <p className="text-sm text-muted-foreground mt-2">لا تغلق الصفحة.</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
              <h1 className="font-black text-xl">تم تفعيل اشتراكك!</h1>
              <p className="text-sm text-muted-foreground mt-2">سنحوّلك إلى صفحة الاشتراك...</p>
            </>
          )}
          {state === 'failed' && (
            <>
              <XCircle className="h-14 w-14 text-red-500 mx-auto mb-4" />
              <h1 className="font-black text-xl">تعذّر إتمام الدفع</h1>
              <p className="text-sm text-muted-foreground mt-2">{reason}</p>
              <Button onClick={() => router.replace('/subscription')} className="mt-5">
                العودة للاشتراك
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <Inner />
    </Suspense>
  );
}
