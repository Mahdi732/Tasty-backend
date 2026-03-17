import { ok } from '../utils/api-response.js';

export class HealthController {
  constructor({ domainEventPublisher }) {
    this.domainEventPublisher = domainEventPublisher;
  }

  status = async (_req, res) => {
    return ok(res, {
      service: 'payment-service',
      rabbitConnected: Boolean(this.domainEventPublisher?.channel),
      status: 'ok',
    });
  };
}
