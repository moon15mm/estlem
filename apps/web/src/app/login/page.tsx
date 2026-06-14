'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import {
  Car, Phone, Lock, Eye, EyeOff, Mail, User, ChevronDown, ChevronUp,
  Loader2, ArrowRight, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const { login } = useCustomerAuth();
  const { dir } = useTranslation();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'main' | 'forgot-email' | 'forgot-reset'>('main');

  // Login fields
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Register fields
  const [regMobile, setRegMobile] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vColor, setVColor] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [devToken, setDevToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newShowPw, setNewShowPw] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loginMobile.length < 9) { toast.error('رقم الجوال غير صحيح'); return; }
    if (!loginPassword) { toast.error('أدخل كلمة المرور'); return; }
    setLoading(true);
    try {
      const mobile = loginMobile.startsWith('0') ? loginMobile : `0${loginMobile}`;
      const result = await api.post('/auth/customer/login', {
        mobile,
        password: loginPassword,
        rememberMe,
      }) as { customer: { id: string; mobile: string; fullName?: string; vehicles?: any[] }; accessToken: string; refreshToken: string };
      login(
        { id: result.customer.id, mobile: result.customer.mobile, fullName: result.customer.fullName, vehicles: result.customer.vehicles ?? [] },
        result.accessToken,
        result.refreshToken,
      );
      toast.success(`مرحباً ${result.customer.fullName ?? result.customer.mobile}`);
      router.push(redirect);
    } catch (e: any) {
      toast.error(e?.message ?? 'رقم الجوال أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (regMobile.length < 9) { toast.error('رقم الجوال غير صحيح'); return; }
    if (!regName.trim()) { toast.error('أدخل الاسم الكامل'); return; }
    if (!regEmail.includes('@')) { toast.error('البريد الإلكتروني غير صحيح'); return; }
    if (regPassword.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      const mobile = regMobile.startsWith('0') ? regMobile : `0${regMobile}`;
      const body: any = { mobile, fullName: regName.trim(), email: regEmail, password: regPassword };
      if (showVehicle && vMake && vModel && vColor) {
        body.vehicle = { make: vMake, model: vModel, color: vColor };
      }
      const result = await api.post('/auth/customer/register', body) as {
        customer: { id: string; mobile: string; fullName?: string; vehicles?: any[] };
        accessToken: string; refreshToken: string;
      };
      login(
        { id: result.customer.id, mobile: result.customer.mobile, fullName: result.customer.fullName, vehicles: result.customer.vehicles ?? [] },
        result.accessToken,
        result.refreshToken,
      );
      toast.success(`مرحباً ${result.customer.fullName}`);
      router.push(redirect);
    } catch (e: any) {
      toast.error(e?.message ?? 'حدث خطأ أثناء إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSend = async () => {
    if (!forgotEmail.includes('@')) { toast.error('أدخل بريد إلكتروني صحيح'); return; }
    setLoading(true);
    try {
      const result = await api.post('/auth/customer/forgot-password', { email: forgotEmail }) as { message: string; devToken?: string };
      if (result.devToken) setDevToken(result.devToken);
      toast.success('تم إرسال رمز إعادة التعيين');
      setView('forgot-reset');
    } catch {
      toast.error('حدث خطأ. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken.trim()) { toast.error('أدخل رمز إعادة التعيين'); return; }
    if (newPassword.length < 8) { toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      await api.post('/auth/customer/reset-password', { token: resetToken.trim(), newPassword });
      toast.success('تم تغيير كلمة المرور بنجاح');
      setView('main');
      setTab('login');
    } catch {
      toast.error('الرمز غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-[#F5F5F5] border border-[#EBEBEB] rounded-2xl px-4 py-3.5 text-base text-[#111] placeholder:text-[#CCC] focus:outline-none focus:border-[#999] focus:bg-white transition-all';
  const labelClass = 'text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1.5 block';
  const ctaClass = 'w-full bg-[#111] text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-30';

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col" dir={dir}>

      {/* Header */}
      <div className="bg-white border-b border-[#F0F0F0] px-5 pt-12 pb-6 flex flex-col items-center text-center relative">
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>
        <div className="w-12 h-12 bg-[#111] rounded-2xl flex items-center justify-center mb-3">
          <Car className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-[#111]">استلم</h1>
        <p className="text-xs text-[#AAA] mt-0.5">اطلب من سيارتك</p>
      </div>

      {/* Forgot password — email step */}
      {view === 'forgot-email' && (
        <div className="flex-1 px-5 pt-6 animate-fade-up">
          <button onClick={() => setView('main')} className="flex items-center gap-1.5 text-[#555] text-sm font-medium mb-6">
            <ArrowRight className="h-4 w-4" /> العودة
          </button>
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 space-y-5">
            <div>
              <h2 className="font-black text-[#111] text-lg mb-1">نسيت كلمة المرور؟</h2>
              <p className="text-xs text-[#AAA] leading-relaxed">أدخل بريدك الإلكتروني وسنرسل لك رمزاً لإعادة تعيين كلمة المرور</p>
            </div>
            <div>
              <label className={labelClass}>البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                  className={`${inputClass} pr-12`}
                  autoFocus
                />
              </div>
            </div>
            <button onClick={handleForgotSend} disabled={loading} className={ctaClass}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إرسال الرمز'}
            </button>
          </div>
        </div>
      )}

      {/* Forgot password — reset step */}
      {view === 'forgot-reset' && (
        <div className="flex-1 px-5 pt-6 animate-fade-up">
          <button onClick={() => setView('forgot-email')} className="flex items-center gap-1.5 text-[#555] text-sm font-medium mb-6">
            <ArrowRight className="h-4 w-4" /> العودة
          </button>
          <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 space-y-5">
            <div>
              <h2 className="font-black text-[#111] text-lg mb-1">إعادة تعيين كلمة المرور</h2>
              <p className="text-xs text-[#AAA] leading-relaxed">أدخل الرمز المرسل إلى بريدك الإلكتروني وكلمة المرور الجديدة</p>
            </div>
            {devToken && (
              <div
                className="bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl p-3 cursor-pointer"
                onClick={() => { setResetToken(devToken); toast.success('تم نسخ الرمز'); }}
              >
                <p className="text-[10px] font-black text-[#BBB] tracking-widest uppercase mb-1">رمز (وضع التطوير — انقر للنسخ)</p>
                <p className="text-xs font-mono text-[#555] break-all">{devToken}</p>
              </div>
            )}
            <div>
              <label className={labelClass}>رمز إعادة التعيين</label>
              <input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="الصق الرمز هنا"
                dir="ltr"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>كلمة المرور الجديدة</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNewShowPw(!newShowPw)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CCC]"
                >
                  {newShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <input
                  type={newShowPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  className={`${inputClass} pl-12`}
                />
              </div>
            </div>
            <button onClick={handleResetPassword} disabled={loading} className={ctaClass}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'تغيير كلمة المرور'}
            </button>
          </div>
        </div>
      )}

      {/* Main view */}
      {view === 'main' && (
        <>
          {/* Tab switcher */}
          <div className="px-5 pt-5">
            <div className="flex bg-white border border-[#EBEBEB] rounded-2xl p-1">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === 'login' ? 'bg-[#111] text-white' : 'text-[#999]'
                }`}
              >
                دخول
              </button>
              <button
                onClick={() => setTab('register')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === 'register' ? 'bg-[#111] text-white' : 'text-[#999]'
                }`}
              >
                حساب جديد
              </button>
            </div>
          </div>

          <div className="flex-1 px-5 pt-4 pb-10">

            {/* LOGIN FORM */}
            {tab === 'login' && (
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 space-y-4 animate-fade-up">
                <div>
                  <label className={labelClass}>رقم الجوال</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <input
                      type="tel"
                      value={loginMobile}
                      onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className={`${inputClass} pr-12 text-center tracking-wider`}
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <button
                      type="button"
                      onClick={() => setLoginShowPw(!loginShowPw)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CCC]"
                    >
                      {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <input
                      type={loginShowPw ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder="••••••••"
                      className={`${inputClass} pr-12 pl-12`}
                    />
                  </div>
                </div>

                {/* Remember me + forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        rememberMe ? 'bg-[#111] border-[#111]' : 'border-[#EBEBEB] bg-white'
                      }`}
                    >
                      {rememberMe && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className="text-sm text-[#555]">تذكرني</span>
                  </label>
                  <button
                    onClick={() => setView('forgot-email')}
                    className="text-sm text-[#555] underline underline-offset-2"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button onClick={handleLogin} disabled={loading} className={ctaClass}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'دخول'}
                </button>

                <p className="text-center text-xs text-[#AAA] pt-1">
                  ليس لديك حساب؟{' '}
                  <button onClick={() => setTab('register')} className="text-[#111] font-bold">
                    سجّل الآن
                  </button>
                </p>
              </div>
            )}

            {/* REGISTER FORM */}
            {tab === 'register' && (
              <div className="bg-white border border-[#EBEBEB] rounded-2xl p-5 space-y-4 animate-fade-up">

                <div>
                  <label className={labelClass}>رقم الجوال</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <input
                      type="tel"
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className={`${inputClass} pr-12 text-center tracking-wider`}
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <input
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="محمد العبدالله"
                      className={`${inputClass} pr-12`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="example@email.com"
                      dir="ltr"
                      className={`${inputClass} pr-12`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#CCC]" />
                    <button
                      type="button"
                      onClick={() => setRegShowPw(!regShowPw)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#CCC]"
                    >
                      {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <input
                      type={regShowPw ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل"
                      className={`${inputClass} pr-12 pl-12`}
                    />
                  </div>
                </div>

                {/* Optional vehicle */}
                <div>
                  <button
                    onClick={() => setShowVehicle(!showVehicle)}
                    className="w-full flex items-center justify-between bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl px-4 py-3 text-sm font-bold text-[#555] transition-all"
                  >
                    <span>بيانات السيارة (اختياري)</span>
                    {showVehicle ? <ChevronUp className="h-4 w-4 text-[#AAA]" /> : <ChevronDown className="h-4 w-4 text-[#AAA]" />}
                  </button>

                  {showVehicle && (
                    <div className="mt-2 space-y-3 animate-fade-up">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>النوع</label>
                          <input
                            value={vMake}
                            onChange={(e) => setVMake(e.target.value)}
                            placeholder="تويوتا"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>الموديل</label>
                          <input
                            value={vModel}
                            onChange={(e) => setVModel(e.target.value)}
                            placeholder="كامري"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>اللون</label>
                        <input
                          value={vColor}
                          onChange={(e) => setVColor(e.target.value)}
                          placeholder="أبيض"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleRegister} disabled={loading} className={ctaClass}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'إنشاء الحساب'}
                </button>

                <p className="text-center text-xs text-[#AAA] pt-1">
                  لديك حساب؟{' '}
                  <button onClick={() => setTab('login')} className="text-[#111] font-bold">
                    سجّل دخولك
                  </button>
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-center text-[10px] text-[#CCC] pb-8 px-6">
        بالتسجيل أنت توافق على شروط الاستخدام وسياسة الخصوصية
      </p>
    </div>
  );
}
