import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { getRequestContext } from '../../../common/src/tracing/context.js';

const buildTracingHeaders = (headers = {}) => {
  const context = getRequestContext();
  const correlationId = headers.correlationId || context?.correlationId || context?.requestId || uuidv4();
  return {
    ...headers,
    eventId: headers.eventId || uuidv4(),
    correlationId,
    causationId: headers.causationId || context?.requestId || null,
    occurredAt: headers.occurredAt || new Date().toISOString(),
  };
};

export class DomainEventPublisher {
  constructor({ url, exchange, logger }) {
    this.url = url;
    this.exchange = exchange;
    this.logger = logger;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
  }

  async publish(routingKey, payload, headers = {}) {
    if (!this.channel) {
      throw new Error('RabbitMQ publisher is not connected');
    }

    const body = Buffer.from(JSON.stringify(payload));
    const tracingHeaders = buildTracingHeaders(headers);
    this.channel.publish(this.exchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: tracingHeaders,
      timestamp: Date.now(),
    });

    this.logger?.info(
      {
        routingKey,
        eventId: tracingHeaders.eventId,
        correlationId: tracingHeaders.correlationId,
      },
      'payment_event_published'
    );
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
