'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Car, Phone, Shield, ArrowLeft, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useCustomerAuth();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const sendOtp = async () => {
    if (mobile.length < 9) {
      toast.error('أدخل رقم جوال صحيح');
      return;
    }
    setLoading(true);
    try {
      const formattedMobile = mobile.startsWith('0') ? mobile : `0${mobile}`;
      await api.post('/auth/otp/send', { mobile: formattedMobile });
      toast.success('تم إرسال رمز التحقق');
      setMobile(formattedMobile);
      setStep('otp');
    } catch {
      toast.error('فشل إرسال الرمز، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('أدخل الرمز المكون من 6 أرقام');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post('/auth/otp/verify', { mobile, otp }) as {
        customer: { id: string; mobile: string; fullName?: string };
        accessToken: string;
        refreshToken: string;
      };

      if (!result.customer.fullName) {
        setIsNewUser(true);
        // Store temp data
        login(
          { id: result.customer.id, mobile: result.customer.mobile },
          result.accessToken,
          result.refreshToken,
        );
        setStep('name');
      } else {
        login(
          { id: result.customer.id, mobile: result.customer.mobile, fullName: result.customer.fullName },
          result.accessToken,
          result.refreshToken,
        );
        toast.success(`أهلاً ${result.customer.fullName}!`);
        router.push('/discover');
      }
    } catch {
      toast.error('رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const saveName = () => {
    if (!fullName.trim()) {
      toast.error('أدخل اسمك');
      return;
    }
    const { useCustomerAuth: store } = require('@/hooks/useCustomerAuth');
    store.getState().updateProfile({ fullName: fullName.trim() });
    toast.success(`أهلاً ${fullName}!`);
    router.push('/discover');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-blue-900 flex flex-col" dir="rtl">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center backdrop-blur-sm mb-6">
          <Car className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">استلم</h1>
        <p className="text-white/70 text-sm">اطلب من سيارتك دون أن تنزل</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-10 shadow-2xl">
        {step === 'phone' && (
          <>
            <h2 className="text-xl font-black text-gray-900 mb-1">تسجيل الدخول</h2>
            <p className="text-gray-500 text-sm mb-6">أدخل رقم جوالك وسنرسل لك رمز تحقق</p>

            <div className="relative mb-4">
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pr-12 pl-4 py-4 text-lg text-center tracking-wider focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                maxLength={10}
              />
            </div>

            <button
              onClick={sendOtp}
              disabled={loading || mobile.length < 9}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إرسال رمز التحقق'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              بالمتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </>
        )}

        {step === 'otp' && (
          <>
            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-primary text-sm mb-4">
              <ArrowLeft className="h-4 w-4" /> تغيير الرقم
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">رمز التحقق</h2>
                <p className="text-gray-500 text-sm">أرسلناه إلى <span className="font-bold" dir="ltr">{mobile}</span></p>
              </div>
            </div>

            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              dir="ltr"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-2xl text-center tracking-[0.5em] font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
              maxLength={6}
              autoFocus
            />

            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تحقق'}
            </button>

            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full text-primary text-sm font-medium mt-3 py-2"
            >
              إعادة إرسال الرمز
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">مرحباً بك!</h2>
                <p className="text-gray-500 text-sm">أخبرنا باسمك لنتمكن من خدمتك</p>
              </div>
            </div>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
              autoFocus
            />

            <button
              onClick={saveName}
              disabled={!fullName.trim()}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50"
            >
              ابدأ الطلب
            </button>
          </>
        )}
      </div>
    </div>
  );
}
