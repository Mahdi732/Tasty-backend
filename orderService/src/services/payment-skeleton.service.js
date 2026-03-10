import { EVENTS } from '../constants/messaging.js';

// Payment implementation intentionally left as a skeleton for the next phase.
export class PaymentSkeletonService {
  constructor({ rabbitBus }) {
    this.rabbitBus = rabbitBus;
  }

  async requestVerification(payload, headers = {}) {
    await this.rabbitBus.publishEvent(EVENTS.PAYMENT_VERIFY, payload, headers);
  }

  async emitStatusChanged(payload, headers = {}) {
    await this.rabbitBus.publishEvent(EVENTS.ORDER_PAYMENT_STATUS_CHANGED, payload, headers);
  }
}

