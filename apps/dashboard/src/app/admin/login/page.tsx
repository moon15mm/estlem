'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import toast from 'react-hot-toast';
import type { SuperAdmin } from '@estlem/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      toast.error('تم تجاوز عدد المحاولات المسموح. انتظر 5 دقائق.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/admin/login`,
        { email, password },
      );
      const data = res.data?.data ?? res.data;
      login(data.admin as SuperAdmin, data.accessToken);
      toast.success('مرحباً بك في لوحة الأدمن');
      router.push('/admin');
    } catch (err: unknown) {
      setAttempts((prev) => prev + 1);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 429) {
        toast.error('محاولات كثيرة جداً. انتظر 5 دقائق.');
      } else {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2137] via-primary to-[#1a3a5c] flex items-center justify-center p-4" dir="rtl">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 relative z-10">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-[#2E86C1] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-foreground">أدمن النظام</h1>
            <p className="text-muted-foreground text-sm mt-2">منصة استلم — دخول المسؤولين</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-primary" />
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@estlem.store"
                required
                dir="ltr"
                className="h-12 text-base"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-primary" />
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  dir="ltr"
                  className="h-12 text-base pl-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {attempts > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
                {5 - attempts > 0
                  ? `متبقي ${5 - attempts} محاولات`
                  : 'تم تجاوز الحد. انتظر 5 دقائق.'}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || attempts >= 5}
              className="w-full h-12 text-base font-bold gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              دخول آمن
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            اتصال مشفّر · الوصول مقيّد للمسؤولين فقط
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
