'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  publishableKey: string;
  amount: number; // in halalas (smallest unit)
  currency: string;
  description: string;
  orderId: string;
  callbackUrl: string;
}

export default function MoyasarCheckout({
  publishableKey, amount, currency, description, orderId, callbackUrl,
}: Props) {
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTestMode = publishableKey.trim().startsWith('pk_test_');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const cleanKey = publishableKey.trim();

    if (cleanKey.startsWith('sk_')) {
      setError('خطأ في الإعدادات: تم استخدام المفتاح السري بدل المفتاح العام (pk_).');
      setLoading(false);
      return;
    }

    if (amount < 100) {
      setError(`المبلغ (${amount} هللة) أقل من الحد الأدنى (100 هللة = 1 ريال).`);
      setLoading(false);
      return;
    }

    // Clear element first to avoid duplicates on hot reload
    const formElement = document.querySelector('.mysr-form');
    if (formElement) formElement.innerHTML = '';

    // Dynamic import — only in browser
    import('moyasar-payment-form')
      .then((mod: any) => {
        const Moyasar = mod.Moyasar ?? mod.default?.Moyasar ?? mod.default;
        if (!Moyasar?.init) throw new Error('Moyasar.init not found');

        Moyasar.init({
          element: '.mysr-form',
          amount,
          currency: currency.toUpperCase(),
          description,
          publishable_api_key: cleanKey,
          callback_url: callbackUrl,
          methods: ['creditcard', 'mada', 'applepay', 'stcpay'],
          locale: 'ar',
          credit_card: { save_card: false },
          metadata: { orderId },
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Moyasar init failed:', err);
        setError('فشل تحميل بوابة الدفع. حاول مرة أخرى.');
        setLoading(false);
      });

    return () => {
      const el = document.querySelector('.mysr-form');
      if (el) el.innerHTML = '';
    };
  }, [publishableKey, amount, currency, description, orderId, callbackUrl]);

  return (
    <div className="space-y-3">
      {isTestMode && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs" dir="rtl">
          <p className="font-bold text-amber-800 mb-1.5">⚠️ وضع الاختبار — استخدم البطاقات التجريبية</p>
          <div className="space-y-1 text-amber-700 font-mono">
            <p>Visa: <span className="select-all">4111 1111 1111 1111</span></p>
            <p>Mastercard: <span className="select-all">5500 0000 0000 0004</span></p>
            <p>MADA: <span className="select-all">4187 4274 1961 2550</span></p>
            <p className="font-sans text-amber-600 mt-1">انتهاء: أي تاريخ مستقبلي · CVV: أي 3 أرقام · OTP: 1234</p>
          </div>
        </div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل بوابة الدفع...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-red-600 font-semibold text-sm">⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-xs text-red-500 underline">
            تحديث الصفحة
          </button>
        </div>
      )}

      {/* Style overrides to force LTR for card fields */}
      <style dangerouslySetInnerHTML={{ __html: `
        .mysr-form, .mysr-form * {
          direction: ltr !important;
          text-align: left !important;
        }
        .mysr-form input {
          direction: ltr !important;
          unicode-bidi: bidi-override !important;
        }
        [lang="ar"] .mysr-form label {
          text-align: right !important;
        }
      `}} />

      {/* Moyasar mounts its form here */}
      <div className="mysr-form" dir="ltr" style={{ textAlign: 'left' }} />
    </div>
  );
}
