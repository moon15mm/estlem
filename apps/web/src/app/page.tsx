import { Car, QrCode, ShoppingBag, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const features = [
    { icon: QrCode, title: 'امسح الرمز', desc: 'امسح رمز QR على موقف سيارتك' },
    { icon: ShoppingBag, title: 'اطلب', desc: 'تصفّح المنتجات واطلب من سيارتك' },
    { icon: Clock, title: 'تتبّع', desc: 'تابع حالة طلبك لحظياً' },
    { icon: Car, title: 'استلم', desc: 'نوصّل طلبك إلى سيارتك مباشرة' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-brand-light px-6 pt-16 pb-20 text-center text-white">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-5 backdrop-blur">
          <Car className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-black mb-3">استلم</h1>
        <p className="text-lg text-white/90 mb-2">اطلب من سيارتك دون أن تنزل</p>
        <p className="text-sm text-white/70 max-w-md mx-auto">
          منصة الطلب من السيارة للبقالات والمطاعم والصيدليات ومتاجر التجزئة
        </p>
      </div>

      {/* How it works */}
      <div className="px-6 -mt-10 pb-10 max-w-2xl mx-auto">
        <Card className="shadow-xl border-0">
          <CardContent className="p-6">
            <h2 className="text-center font-bold text-foreground mb-6">كيف تعمل؟</h2>
            <div className="grid grid-cols-2 gap-5">
              {features.map((f, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                    <f.icon className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-sm text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary text-muted-foreground text-sm px-4 py-3 rounded-xl">
            <QrCode className="h-5 w-5" />
            امسح رمز QR الموجود على موقف سيارتك للبدء
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-muted-foreground">
            هل أنت صاحب متجر؟{' '}
            <a
              href="https://estlem.store/dashboard/login"
              className="text-primary font-bold underline"
            >
              لوحة التحكم
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
