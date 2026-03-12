import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { getRequestContext } from '../../../common/src/tracing/context.js';

const buildTracingHeaders = (headers = {}) => {
  const context = getRequestContext();
  const correlationId = headers.correlationId || context?.correlationId || context?.requestId || uuidv4();
  return {
    ...headers,
    correlationId,
    causationId: headers.causationId || context?.requestId || null,
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
    if (this.connection && this.channel) {
      return;
    }
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
  }

  async publish(routingKey, payload, headers = {}) {
    await this.connect();
    const body = Buffer.from(JSON.stringify(payload));
    const enrichedHeaders = buildTracingHeaders(headers);
    this.channel.publish(this.exchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: enrichedHeaders,
      timestamp: Date.now(),
    });
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.channel = null;
    this.connection = null;
  }
}

