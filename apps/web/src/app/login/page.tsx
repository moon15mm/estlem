'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Car, Phone, Shield, ArrowRight, Loader2, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1B4F72]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const { login, updateProfile } = useCustomerAuth();
  const { t, dir } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (mobile.length < 9) { toast.error(t('login.invalidMobile')); return; }
    setLoading(true);
    try {
      const formatted = mobile.startsWith('0') ? mobile : `0${mobile}`;
      await api.post('/auth/otp/send', { mobile: formatted });
      toast.success('تم إرسال رمز التحقق');
      setMobile(formatted);
      setStep('otp');
    } catch { toast.error(t('login.sendFailed')); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { toast.error(t('login.enterOtp')); return; }
    setLoading(true);
    try {
      const result = await api.post('/auth/otp/verify', { mobile, otp }) as {
        customer: { id: string; mobile: string; fullName?: string; vehicles?: any[] };
        accessToken: string;
        refreshToken: string;
      };
      if (!result.customer.fullName) {
        login({ id: result.customer.id, mobile: result.customer.mobile }, result.accessToken, result.refreshToken);
        setStep('name');
      } else {
        login(
          {
            id: result.customer.id,
            mobile: result.customer.mobile,
            fullName: result.customer.fullName,
            vehicles: result.customer.vehicles ?? [],
          },
          result.accessToken, result.refreshToken,
        );
        toast.success(`مرحباً ${result.customer.fullName}`);
        router.push(redirect);
      }
    } catch { toast.error(t('login.invalidOtp')); }
    finally { setLoading(false); }
  };

  const saveName = () => {
    if (!fullName.trim()) { toast.error(t('login.enterName')); return; }
    updateProfile({ fullName: fullName.trim() });
    toast.success(`مرحباً ${fullName}`);
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col" dir={dir}>
      {/* Top — gradient */}
      <div className="flex-1 bg-gradient-to-bl from-[#0F3460] via-[#1B4F72] to-[#16537E] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#1ABC9C]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

        {/* Language switcher */}
        <div className="absolute top-4 end-4 z-20">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 text-center animate-fade-up">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/10 animate-float">
            <Car className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1.5">{t('app.name')}</h1>
          <p className="text-white/50 text-sm">{t('login.tagline')}</p>
        </div>
      </div>

      {/* Bottom — form card */}
      <div className="bg-white rounded-t-[2rem] -mt-6 relative z-10 px-6 pt-8 pb-10 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] animate-fade-up delay-200">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {['phone', 'otp', 'name'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-[#1B4F72] text-white scale-110' :
                ['phone', 'otp', 'name'].indexOf(step) > i ? 'bg-[#1ABC9C] text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {['phone', 'otp', 'name'].indexOf(step) > i ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 rounded ${['phone', 'otp', 'name'].indexOf(step) > i ? 'bg-[#1ABC9C]' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>

        {step === 'phone' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">{t('login.title')}</h2>
              <p className="text-gray-400 text-sm">{t('login.subtitle')}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{t('login.mobile')}</label>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-12 pl-4 py-4 text-base text-center tracking-wider focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10 transition-all"
                  maxLength={10}
                />
              </div>
            </div>

            <button
              onClick={sendOtp}
              disabled={loading || mobile.length < 9}
              className="w-full bg-[#1B4F72] text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('login.sendCode')}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-5">
            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-[#1B4F72] text-sm font-medium cursor-pointer">
              <ArrowRight className="h-4 w-4" /> {t('login.changeNumber')}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#1ABC9C]/10 rounded-xl flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-[#1ABC9C]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">{t('login.code')}</h2>
                <p className="text-gray-400 text-sm">{t('login.otpSentTo')} <span className="font-bold text-gray-600" dir="ltr">{mobile}</span></p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{t('login.codeLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                dir="ltr"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-2xl text-center tracking-[0.4em] font-bold focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10 transition-all"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              onClick={verifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#1B4F72] text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('login.verify')}
            </button>

            <button onClick={sendOtp} disabled={loading} className="w-full text-[#1B4F72] text-sm font-medium py-2 cursor-pointer">
              {t('login.resend')}
            </button>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-[#1B4F72]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">{t('login.welcome')}</h2>
                <p className="text-gray-400 text-sm">{t('login.welcomeDesc')}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{t('login.fullName')}</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('login.fullNamePlaceholder')}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base focus:outline-none focus:border-[#1B4F72] focus:ring-2 focus:ring-[#1B4F72]/10 transition-all"
                autoFocus
              />
            </div>

            <button
              onClick={saveName}
              disabled={!fullName.trim()}
              className="w-full bg-[#1B4F72] text-white py-4 rounded-xl font-bold text-base disabled:opacity-40 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-[#1B4F72]/20"
            >
              {t('login.startOrder')}
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-300 mt-6">
          {t('login.terms')}
        </p>
      </div>
    </div>
  );
}
