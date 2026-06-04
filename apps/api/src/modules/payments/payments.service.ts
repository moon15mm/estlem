import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Store } from '../../database/entities/store.entity';
import { PaymentStatus, PaymentMethod } from '@estlem/shared';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

interface StoreSettings {
  paymentSettings?: {
    provider?: 'moyasar' | 'test';
    moyasarPublishableKey?: string;
    moyasarSecretKey?: string;
  };
  paymentMethods?: { cash?: boolean; card?: boolean; mada?: boolean; apple_pay?: boolean };
  [k: string]: any;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    private config: ConfigService,
  ) {}

  private mapMethodToMoyasar(method: PaymentMethod): string[] {
    switch (method) {
      case PaymentMethod.MADA: return ['creditcard']; // mada cards use creditcard source w/ mada flag
      case PaymentMethod.CARD: return ['creditcard'];
      case PaymentMethod.APPLE_PAY: return ['applepay'];
      default: return ['creditcard'];
    }
  }

  async initiatePayment(orderId: string, method: PaymentMethod, returnUrl: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order already paid');
    }

    // Cash: no gateway, mark as pending payment
    if (method === PaymentMethod.CASH) {
      const payment = this.paymentRepo.create({
        orderId,
        amount: order.total,
        currency: 'SAR',
        method,
        status: PaymentStatus.PENDING,
      });
      await this.paymentRepo.save(payment);
      return { method: 'cash', message: 'Pay on delivery' };
    }

    // Get store payment settings
    const store = await this.storeRepo.findOne({ where: { id: order.storeId } });
    const settings = (store?.operatingHours ?? {}) as StoreSettings;
    const secretKey =
      settings.paymentSettings?.moyasarSecretKey ||
      this.config.get<string>('MOYASAR_SECRET_KEY');

    // No real gateway configured — return test payment URL
    if (!secretKey) {
      const sessionId = `test_${Date.now()}`;
      const payment = this.paymentRepo.create({
        orderId,
        gatewayRef: sessionId,
        amount: order.total,
        currency: 'SAR',
        method,
        status: PaymentStatus.PENDING,
        metadata: { returnUrl, mode: 'test' },
      });
      await this.paymentRepo.save(payment);
      return {
        sessionId,
        paymentUrl: `${returnUrl}?test_payment=success&session=${sessionId}`,
        testMode: true,
        message: 'Test mode — payment will auto-confirm',
      };
    }

    // Real Moyasar integration
    try {
      const amountHalalas = Math.round(Number(order.total) * 100);
      const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

      const body = {
        amount: amountHalalas,
        currency: 'SAR',
        description: `Order #${order.orderNumber}`,
        callback_url: returnUrl,
        source: { type: this.mapMethodToMoyasar(method)[0] },
        metadata: { orderId, orderNumber: order.orderNumber },
      };

      const response = await fetch(`${MOYASAR_API_BASE}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();
      if (!response.ok) {
        throw new BadRequestException(data?.message || 'Moyasar request failed');
      }

      const payment = this.paymentRepo.create({
        orderId,
        gatewayRef: data.id,
        amount: order.total,
        currency: 'SAR',
        method,
        status: PaymentStatus.PENDING,
        metadata: { returnUrl, invoiceUrl: data.url, mode: 'live' },
      });
      await this.paymentRepo.save(payment);

      return {
        sessionId: data.id,
        paymentUrl: data.url,
        expiresAt: data.expired_at,
      };
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'فشل بدء الدفع');
    }
  }

  /**
   * Confirm a test payment immediately (used by the test flow)
   */
  async confirmTestPayment(sessionId: string) {
    const payment = await this.paymentRepo.findOne({ where: { gatewayRef: sessionId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if ((payment.metadata as any)?.mode !== 'test') {
      throw new BadRequestException('Not a test payment');
    }
    payment.status = PaymentStatus.PAID;
    payment.capturedAt = new Date();
    await this.paymentRepo.save(payment);
    await this.orderRepo.update(payment.orderId, { paymentStatus: PaymentStatus.PAID });
    return payment;
  }

  async handleWebhook(payload: Record<string, unknown>) {
    // Moyasar webhook payload structure
    const data: any = payload;

    // Moyasar wraps payment data in 'data' field
    const paymentData = data.data ?? data;
    const gatewayRef = paymentData?.id;
    const status = paymentData?.status;

    if (!gatewayRef) return;

    const payment = await this.paymentRepo.findOne({ where: { gatewayRef } });
    if (!payment) return;

    if (status === 'paid' || status === 'captured') {
      payment.status = PaymentStatus.PAID;
      payment.capturedAt = new Date();
      await this.paymentRepo.save(payment);
      await this.orderRepo.update(payment.orderId, { paymentStatus: PaymentStatus.PAID });
    } else if (status === 'failed' || status === 'declined' || status === 'voided') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
    }
  }

  async refund(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Payment is not captured');
    }

    // Moyasar refund (only for real payments)
    if ((payment.metadata as any)?.mode === 'live') {
      const order = await this.orderRepo.findOne({ where: { id: payment.orderId } });
      const store = order ? await this.storeRepo.findOne({ where: { id: order.storeId } }) : null;
      const settings = (store?.operatingHours ?? {}) as StoreSettings;
      const secretKey =
        settings.paymentSettings?.moyasarSecretKey ||
        this.config.get<string>('MOYASAR_SECRET_KEY');

      if (secretKey && payment.gatewayRef) {
        try {
          const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
          await fetch(`${MOYASAR_API_BASE}/payments/${payment.gatewayRef}/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: auth },
          });
        } catch { /* log only — proceed with local refund */ }
      }
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    await this.paymentRepo.save(payment);
    await this.orderRepo.update(payment.orderId, { paymentStatus: PaymentStatus.REFUNDED });
    return payment;
  }
}
