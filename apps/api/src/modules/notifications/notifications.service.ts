import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@estlem/shared';
import { Order } from '../../database/entities/order.entity';
import { Customer } from '../../database/entities/customer.entity';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';

const TEMPLATES: Record<OrderStatus, { ar: string; en: string }> = {
  [OrderStatus.PENDING_QUOTE]: {
    ar: 'تم استلام طلبك {{orderNumber}}. سيقوم المحل بتسعير العناصر وإرسالها لك للمراجعة.',
    en: 'Order {{orderNumber}} received. Store is pricing the items and will send for your approval.',
  },
  [OrderStatus.PENDING_APPROVAL]: {
    ar: 'تم تسعير طلبك {{orderNumber}}. الرجاء مراجعة السعر والموافقة عليه عبر الرابط.',
    en: 'Your order {{orderNumber}} has been priced. Please review and approve.',
  },
  [OrderStatus.NEW]: {
    ar: 'تم استلام طلبك رقم {{orderNumber}} بنجاح. سنبدأ التحضير قريباً.',
    en: 'Order {{orderNumber}} received. We will start preparing it shortly.',
  },
  [OrderStatus.ACCEPTED]: {
    ar: 'تم قبول طلبك {{orderNumber}} وسيتم التحضير الآن.',
    en: 'Order {{orderNumber}} accepted and being prepared now.',
  },
  [OrderStatus.PREPARING]: {
    ar: 'جاري تحضير طلبك {{orderNumber}}. الوقت المتوقع: {{estimatedMins}} دقيقة.',
    en: 'Preparing your order {{orderNumber}}. ETA: {{estimatedMins}} minutes.',
  },
  [OrderStatus.READY]: {
    ar: 'طلبك {{orderNumber}} جاهز! سنوصله إلى سيارتك الآن.',
    en: 'Order {{orderNumber}} is ready! Bringing it to your car now.',
  },
  [OrderStatus.DELIVERED]: {
    ar: 'تم توصيل طلبك {{orderNumber}}. شكراً لك!',
    en: 'Order {{orderNumber}} delivered. Thank you!',
  },
  [OrderStatus.CANCELLED]: {
    ar: 'تم إلغاء طلبك {{orderNumber}}.',
    en: 'Order {{orderNumber}} has been cancelled.',
  },
};

@Injectable()
export class NotificationsService {
  constructor(
    private sms: SmsProvider,
    private whatsapp: WhatsappProvider,
  ) {}

  async sendOrderStatus(order: Order, customer: Customer): Promise<void> {
    const template = TEMPLATES[order.status];
    if (!template) return;

    const lang = customer.preferredLang ?? 'ar';
    const text = (lang === 'ar' ? template.ar : template.en)
      .replace('{{orderNumber}}', order.orderNumber)
      .replace('{{estimatedMins}}', String(order.estimatedMins ?? 10));

    await Promise.allSettled([
      this.sms.send(customer.mobile, text),
      // WhatsApp only for key statuses
      [OrderStatus.READY, OrderStatus.DELIVERED].includes(order.status)
        ? this.whatsapp.send(customer.mobile, text)
        : Promise.resolve(),
    ]);
  }
}
