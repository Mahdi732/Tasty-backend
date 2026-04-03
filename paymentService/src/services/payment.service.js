import { v4 as uuidv4 } from 'uuid';
import { EVENTS } from '../constants/messaging.js';
import { PAYMENT_STATUS, PAYMENT_TRANSACTION_TYPE } from '../constants/payment.js';

const simulateProviderCharge = async () => {
  const providerRef = `sim_${uuidv4()}`;
  return {
    provider: 'SIMULATED',
    providerRef,
    status: PAYMENT_STATUS.SUCCESS,
  };
};

export class PaymentService {
  constructor({ transactionRepository, domainEventPublisher }) {
    this.transactionRepository = transactionRepository;
    this.domainEventPublisher = domainEventPublisher;
  }

  async createSubscriptionPayment(payload, headers = {}) {
    const restaurantId = typeof payload.restaurantId === 'string' && payload.restaurantId.trim()
      ? payload.restaurantId.trim()
      : null;

    const pending = await this.transactionRepository.create({
      transactionType: PAYMENT_TRANSACTION_TYPE.SUBSCRIPTION,
      status: PAYMENT_STATUS.PENDING,
      userId: String(payload.userId),
      restaurantId,
      planId: String(payload.planId),
      amount: Number(payload.amount || 0),
      currency: payload.currency || 'USD',
      paymentMethod: payload.payment || {},
      metadata: {
        source: 'api',
      },
    });

    const providerCharge = await simulateProviderCharge();

    const success = await this.transactionRepository.updateById(pending._id, {
      status: providerCharge.status,
      provider: providerCharge.provider,
      providerRef: providerCharge.providerRef,
      processedAt: new Date(),
      failedReason: null,
    });

    let emittedEvent = null;
    let eventPayload = null;

    if (restaurantId) {
      emittedEvent = EVENTS.PAYMENT_SUBSCRIPTION_SUCCESS;
      eventPayload = {
        ownerId: String(payload.userId),
        restaurantId,
        planId: String(payload.planId),
        transactionId: String(success._id),
        providerRef: providerCharge.providerRef,
        amount: Number(success.amount || 0),
        currency: success.currency || 'USD',
        status: PAYMENT_STATUS.SUCCESS,
      };

      await this.domainEventPublisher.publish(
        emittedEvent,
        eventPayload,
        {
          userId: String(payload.userId),
          restaurantId,
          paymentContext: 'SUBSCRIPTION',
          correlationId: headers.correlationId,
          causationId: headers.causationId,
        }
      );
    }

    return {
      transaction: success,
      emittedEvent,
      eventPayload,
    };
  }

  async createOrderPayment(payload, headers = {}) {
    const pending = await this.transactionRepository.create({
      transactionType: PAYMENT_TRANSACTION_TYPE.ORDER,
      status: PAYMENT_STATUS.PENDING,
      userId: String(payload.userId),
      orderId: String(payload.orderId),
      amount: Number(payload.amount),
      currency: payload.currency || 'USD',
      paymentMethod: payload.payment || {},
      metadata: {
        source: 'api',
      },
    });

    const providerCharge = await simulateProviderCharge();

    const success = await this.transactionRepository.updateById(pending._id, {
      status: providerCharge.status,
      provider: providerCharge.provider,
      providerRef: providerCharge.providerRef,
      processedAt: new Date(),
      failedReason: null,
    });

    await this.domainEventPublisher.publish(
      EVENTS.PAYMENT_ORDER_SUCCESS,
      {
        userId: String(payload.userId),
        orderId: String(payload.orderId),
        amount: Number(payload.amount),
        currency: payload.currency || 'USD',
        transactionId: String(success._id),
        providerRef: providerCharge.providerRef,
        status: PAYMENT_STATUS.SUCCESS,
      },
      {
        userId: String(payload.userId),
        orderId: String(payload.orderId),
        paymentContext: 'ORDER',
        correlationId: headers.correlationId,
        causationId: headers.causationId,
      }
    );

    return {
      transaction: success,
      emittedEvent: EVENTS.PAYMENT_ORDER_SUCCESS,
    };
  }

  async handleWebhook(payload, headers = {}) {
    return {
      accepted: true,
      provider: payload?.provider || 'STRIPE',
      receivedAt: new Date().toISOString(),
      note: 'Webhook signature verification and provider callbacks are not implemented yet',
      correlationId: headers.correlationId || null,
    };
  }
}
