import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, PaymentStatus, Role } from '@prisma/client';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { MESSAGES } from '../../common/constants/messages.constant';

const PLAN_MONTHS: Record<SubscriptionPlan, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  MONTHLY: 'Gói 1 tháng',
  QUARTERLY: 'Gói 3 tháng',
  SEMI_ANNUAL: 'Gói 6 tháng',
  ANNUAL: 'Gói 1 năm',
};

const PLAN_PRICE_ENV: Record<SubscriptionPlan, string> = {
  MONTHLY: 'PREMIUM_PRICE_MONTHLY',
  QUARTERLY: 'PREMIUM_PRICE_QUARTERLY',
  SEMI_ANNUAL: 'PREMIUM_PRICE_SEMI_ANNUAL',
  ANNUAL: 'PREMIUM_PRICE_ANNUAL',
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private merchantId: string;
  private secretKey: string;
  private checkoutUrl: string;
  private callbackBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.merchantId = this.configService.get<string>('SEPAY_MERCHANT_ID', '');
    this.secretKey = this.configService.get<string>('SEPAY_SECRET_KEY', '');
    const env = this.configService.get<string>('SEPAY_ENV', 'sandbox');
    this.checkoutUrl =
      env === 'production'
        ? 'https://pay.sepay.vn'
        : 'https://pay-sandbox.sepay.vn';
    this.callbackBaseUrl = this.configService.get<string>(
      'SEPAY_CALLBACK_BASE_URL',
      'http://localhost:3001/api/v1',
    );
  }

  async createCheckout(userId: string, dto: CreateCheckoutDto) {
    const priceEnv = PLAN_PRICE_ENV[dto.plan];
    const amount = parseInt(this.configService.get<string>(priceEnv, '99000'));
    const invoiceNumber = `IQX-${Date.now()}`;
    const description = `IQX Premium - ${PLAN_LABELS[dto.plan]}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        invoiceNumber,
        description,
        status: PaymentStatus.PENDING,
      },
    });

    const fields: Record<string, string> = {
      merchant: this.merchantId,
      currency: 'VND',
      order_amount: amount.toString(),
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER',
      order_description: description,
      order_invoice_number: invoiceNumber,
      customer_id: userId,
      success_url: `${this.callbackBaseUrl}/payments/callback/success`,
      error_url: `${this.callbackBaseUrl}/payments/callback/error`,
      cancel_url: `${this.callbackBaseUrl}/payments/callback/cancel`,
    };

    fields.signature = this.generateSignature(fields);

    return {
      message: MESSAGES.PAYMENT.CHECKOUT_CREATED,
      data: {
        paymentId: payment.id,
        checkoutUrl: `${this.checkoutUrl}/v1/checkout/init`,
        fields,
        plan: dto.plan,
        planLabel: PLAN_LABELS[dto.plan],
        amount,
      },
    };
  }

  async handleIpn(body: any) {
    this.logger.log(`IPN received: ${JSON.stringify(body)}`);

    if (body.notification_type !== 'ORDER_PAID') {
      return { message: MESSAGES.PAYMENT.IPN_RECEIVED, data: null };
    }

    const invoiceNumber = body.order?.order_invoice_number;

    if (!invoiceNumber) {
      this.logger.warn('IPN missing invoice number');
      return { message: MESSAGES.PAYMENT.IPN_RECEIVED, data: null };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { invoiceNumber },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for invoice: ${invoiceNumber}`);
      return { message: MESSAGES.PAYMENT.NOT_FOUND, data: null };
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { message: MESSAGES.PAYMENT.IPN_RECEIVED, data: null };
    }

    const plan = this.detectPlanFromAmount(Number(payment.amount));
    const months = PLAN_MONTHS[plan];

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + months);

    await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId: payment.userId,
          plan,
          startDate: now,
          endDate,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          subscriptionId: subscription.id,
          sepayOrderId: body.order?.order_id,
          sepayTransactionId: body.transaction?.transaction_id,
        },
      });

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          role: Role.PREMIUM,
          premiumExpiresAt: endDate,
        },
      });
    });

    this.logger.log(
      `User ${payment.userId} upgraded to PREMIUM until ${endDate}`,
    );

    return {
      message: MESSAGES.PAYMENT.UPGRADE_SUCCESS,
      data: null,
    };
  }

  async getHistory(userId: string, pagination: PaginationDto) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { subscription: true },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      message: MESSAGES.PAYMENT.HISTORY,
      data: {
        items: payments,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / (pagination.limit ?? 10)),
      },
    };
  }

  async getPlans() {
    const plans = Object.values(SubscriptionPlan).map((plan) => ({
      plan,
      label: PLAN_LABELS[plan],
      months: PLAN_MONTHS[plan],
      price: parseInt(
        this.configService.get<string>(PLAN_PRICE_ENV[plan], '99000'),
      ),
      currency: 'VND',
    }));

    return {
      message: MESSAGES.COMMON.SUCCESS,
      data: plans,
    };
  }

  private detectPlanFromAmount(amount: number): SubscriptionPlan {
    for (const plan of Object.values(SubscriptionPlan)) {
      const price = parseInt(
        this.configService.get<string>(PLAN_PRICE_ENV[plan], '0'),
      );
      if (price === amount) return plan;
    }
    return SubscriptionPlan.MONTHLY;
  }

  private generateSignature(fields: Record<string, string>): string {
    const signedFieldNames = [
      'merchant',
      'operation',
      'payment_method',
      'order_amount',
      'currency',
      'order_invoice_number',
      'order_description',
      'customer_id',
      'success_url',
      'error_url',
      'cancel_url',
    ];

    const signData = signedFieldNames
      .filter((field) => fields[field] !== undefined)
      .map((field) => `${field}=${fields[field] ?? ''}`)
      .join(',');

    return Buffer.from(
      createHmac('sha256', this.secretKey).update(signData).digest(),
    ).toString('base64');
  }
}
