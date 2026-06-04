'use client';

import { useState } from 'react';
import { Ban, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  customerId: string;
  customerName?: string;
  customerMobile?: string;
  onClose: () => void;
  onBlocked?: () => void;
}

export function BlockCustomerModal({ customerId, customerName, customerMobile, onClose, onBlocked }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/customers/${customerId}/block`, { reason: reason.trim() || undefined });
      toast.success('تم حظر العميل من متجرك');
      onBlocked?.();
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const rawMsg = err?.response?.data?.message;
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
      console.error('Block error:', { status, msg, error: err });

      if (status === 409) {
        toast.error('العميل محظور مسبقاً');
        onClose();
      } else if (status === 401 || status === 403) {
        toast.error('ليس لديك صلاحية الحظر (Owner/Manager فقط)');
      } else if (status === 404) {
        toast.error('endpoint غير موجود — الـ API لم يُحدّث بعد');
      } else if (status === 500) {
        toast.error(`خطأ في السيرفر: ${msg ?? 'unknown'}`);
      } else {
        toast.error(typeof msg === 'string' ? msg : `فشل الحظر (${status ?? 'no response'})`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <Card className="w-full max-w-md p-0 overflow-hidden rounded-b-none md:rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-l from-red-600 to-red-500 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-base">حظر العميل</h2>
              <p className="text-white/70 text-xs">من متجرك فقط</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Customer info */}
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-xs text-muted-foreground">العميل:</p>
            <p className="font-bold text-foreground">{customerName ?? '—'}</p>
            {customerMobile && (
              <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{customerMobile}</p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
            بعد الحظر، لن يستطيع هذا العميل إرسال أي طلب لمتجرك. يمكنك فك الحظر لاحقاً من صفحة "المحظورين".
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">سبب الحظر (اختياري):</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثل: طلبات مزيفة، إساءة لفظية..."
              className="w-full bg-secondary/50 border border-input rounded-xl p-3 text-sm focus:outline-none focus:border-red-400 h-20 resize-none"
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
              إلغاء
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              تأكيد الحظر
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
