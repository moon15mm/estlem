import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../../database/entities/payment.entity';
import { Order } from '../../database/entities/order.entity';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@estlem/shared';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private config: ConfigService,
  ) {}

  async initiatePayment(orderId: string, method: PaymentMethod, returnUrl: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order already paid');
    }

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

    // Checkout.com integration point
    // const checkoutClient = new Checkout(this.config.get('CHECKOUT_SECRET_KEY'));
    // const session = await checkoutClient.paymentSessions.request({...});
    // For now: return mock session
    const sessionId = `mock_${Date.now()}`;
    const payment = this.paymentRepo.create({
      orderId,
      gatewayRef: sessionId,
      amount: order.total,
      currency: 'SAR',
      method,
      status: PaymentStatus.PENDING,
      metadata: { returnUrl },
    });
    await this.paymentRepo.save(payment);

    return {
      sessionId,
      paymentUrl: `https://checkout.com/pay/${sessionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async handleWebhook(payload: Record<string, unknown>) {
    const { id: gatewayRef, status, metadata } = payload as {
      id: string;
      status: string;
      metadata: { orderId: string };
    };

    const payment = await this.paymentRepo.findOne({ where: { gatewayRef } });
    if (!payment) return;

    if (status === 'Captured') {
      payment.status = PaymentStatus.PAID;
      payment.capturedAt = new Date();
      await this.paymentRepo.save(payment);

      await this.orderRepo.update(payment.orderId, { paymentStatus: PaymentStatus.PAID });
    } else if (status === 'Declined' || status === 'Failed') {
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

    // Checkout.com refund call goes here
    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    await this.paymentRepo.save(payment);

    await this.orderRepo.update(payment.orderId, { paymentStatus: PaymentStatus.REFUNDED });
    return payment;
  }
}
