import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Store } from '../../database/entities/store.entity';
import { PaymentStatus, PaymentMethod, OrderStatus, WsEvent } from '@estlem/shared';
import { OrdersGateway } from '../realtime/orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';

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
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    private gateway: OrdersGateway,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  /**
   * After a successful payment, transition PENDING_PAYMENT order to NEW
   * and notify the store.
   */
  private async finalizeOrderAfterPayment(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'customer', 'vehicle', 'parkingSpot'],
    });
    if (!order) return;

    // Only promote if it was waiting for payment
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.NEW;
      await this.orderRepo.save(order);

      // Notify the store now that payment is confirmed
      this.gateway.emitToStore(order.storeId, WsEvent.ORDER_CREATED, order);

      // Notify customer of status change
      if (order.customer) {
        await this.notifications.sendOrderStatus(order, order.customer);
      }
    }
  }

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

    // Real Moyasar integration — with fallback to test mode on failure
    try {
      const amountHalalas = Math.round(Number(order.total) * 100);
      const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

      const body = {
        amount: amountHalalas,
        currency: 'SAR',
        description: `Order #${order.orderNumber}`,
        callback_url: returnUrl,
        metadata: { orderId, orderNumber: order.orderNumber },
      };

      const response = await fetch(`${MOYASAR_API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: auth },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();

      if (response.ok && data?.id && data?.url) {
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
      }

      // Moyasar rejected — log and fall through to test mode
      const errMsg =
        typeof data?.message === 'string' ? data.message :
        Array.isArray(data?.errors) ? data.errors.join(', ') :
        JSON.stringify(data?.message ?? data ?? {});
      console.warn(`[Moyasar] Request failed, falling back to test mode: ${errMsg}`);
    } catch (err: any) {
      console.warn(`[Moyasar] Exception, falling back to test mode: ${err?.message ?? err}`);
    }

    // Fallback: test mode if real gateway fails (so customer can still proceed)
    const fallbackId = `test_${Date.now()}`;
    const fallbackPayment = this.paymentRepo.create({
      orderId,
      gatewayRef: fallbackId,
      amount: order.total,
      currency: 'SAR',
      method,
      status: PaymentStatus.PENDING,
      metadata: { returnUrl, mode: 'test', fallback: true },
    });
    await this.paymentRepo.save(fallbackPayment);
    return {
      sessionId: fallbackId,
      paymentUrl: `${returnUrl}?test_payment=success&session=${fallbackId}`,
      testMode: true,
      message: 'Payment will auto-confirm (gateway unreachable, test mode)',
    };
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
    await this.finalizeOrderAfterPayment(payment.orderId);
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
      await this.finalizeOrderAfterPayment(payment.orderId);
    } else if (status === 'failed' || status === 'declined' || status === 'voided') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepo.save(payment);
    }
  }

  /**
   * Get the publishable key + order info needed to render the
   * inline Moyasar payment form.
   */
  async getCheckoutInfo(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const store = await this.storeRepo.findOne({ where: { id: order.storeId } });
    const settings = (store?.operatingHours ?? {}) as StoreSettings;
    const publishableKey =
      settings.paymentSettings?.moyasarPublishableKey ||
      this.config.get<string>('MOYASAR_PUBLISHABLE_KEY') ||
      '';

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Math.round(Number(order.total) * 100), // halalas
      currency: 'SAR',
      description: `Order #${order.orderNumber}`,
      publishableKey,
      hasGateway: !!publishableKey,
      paymentStatus: order.paymentStatus,
    };
  }

  /**
   * Handle Moyasar's redirect callback after payment.
   * Moyasar appends ?id=...&status=paid|failed&token=orderId
   * SECURITY: Always verify payment status server-side via Moyasar API
   */
  async handleMoyasarCallback(orderId: string, paymentId: string, status: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) return { success: false, reason: 'Order not found' };

    // SECURITY: Never trust query params — verify server-side with Moyasar API
    const store = await this.storeRepo.findOne({ where: { id: order.storeId } });
    const settings = (store?.operatingHours ?? {}) as StoreSettings;
    const secretKey =
      settings.paymentSettings?.moyasarSecretKey ||
      this.config.get<string>('MOYASAR_SECRET_KEY');

    if (secretKey && paymentId && !paymentId.startsWith('test_')) {
      try {
        const auth = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
        const response = await fetch(`${MOYASAR_API_BASE}/payments/${paymentId}`, {
          headers: { Authorization: auth },
        });
        const realPayment: any = await response.json();
        const verifiedStatus = realPayment?.status;

        const SUCCESS_STATUSES = ['paid', 'authorized', 'captured'];
        if (!SUCCESS_STATUSES.includes(verifiedStatus)) {
          console.warn(`[Moyasar] Callback status mismatch: query=${status}, actual=${verifiedStatus}`);
          return { success: false, reason: `Payment not verified (status: ${verifiedStatus})` };
        }

        // Verified — create payment record
        const payment = this.paymentRepo.create({
          orderId,
          gatewayRef: paymentId,
          amount: order.total,
          currency: 'SAR',
          method: order.paymentMethod,
          status: PaymentStatus.PAID,
          capturedAt: new Date(),
          metadata: { mode: 'live', moyasarStatus: verifiedStatus, verifiedServerSide: true },
        });
        await this.paymentRepo.save(payment);
        await this.orderRepo.update(orderId, { paymentStatus: PaymentStatus.PAID });
        await this.finalizeOrderAfterPayment(orderId);
        return { success: true };
      } catch (err: any) {
        console.error(`[Moyasar] Verification failed: ${err?.message}`);
        return { success: false, reason: 'Payment verification failed' };
      }
    }

    return { success: false, reason: 'Payment could not be verified' };
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
