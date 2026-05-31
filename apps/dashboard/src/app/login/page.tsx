'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import type { Staff } from '@estlem/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = (await api.post('/auth/staff/login', { mobile, pin })) as {
        staff: Staff;
        accessToken: string;
      };
      login(data.staff, data.accessToken);
      router.push('/orders');
    } catch {
      toast.error('بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-sm shadow-2xl border-0">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Car className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-black text-foreground">استلم</h1>
            <p className="text-muted-foreground text-sm mt-1">دخول الموظفين</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">رقم الجوال</label>
              <Input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                placeholder="+966xxxxxxxxx"
                dir="ltr"
                className="text-center"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">الرقم السري (PIN)</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                maxLength={6}
                placeholder="• • • •"
                className="text-center tracking-[0.5em] text-xl"
              />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'دخول'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
