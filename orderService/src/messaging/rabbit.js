import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { getRequestContext, runWithRequestContext } from '../../../common/src/tracing/context.js';

const buildTracingHeaders = (headers = {}) => {
  const context = getRequestContext();
  const correlationId = headers.correlationId || context?.correlationId || context?.requestId || uuidv4();
  return {
    ...headers,
    correlationId,
    causationId: headers.causationId || context?.requestId || null,
  };
};

const toRequestContextFromHeaders = (headers = {}) => ({
  requestId: headers.causationId || headers.requestId || headers.correlationId || null,
  correlationId: headers.correlationId || headers.requestId || null,
});

export class RabbitBus {
  constructor({ url, eventsExchange, commandsExchange, prefetch, logger }) {
    this.url = url;
    this.eventsExchange = eventsExchange;
    this.commandsExchange = commandsExchange;
    this.prefetch = prefetch;
    this.logger = logger;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.eventsExchange, 'topic', { durable: true });
    await this.channel.assertExchange(this.commandsExchange, 'topic', { durable: true });
    await this.channel.prefetch(this.prefetch);
  }

  async publishEvent(routingKey, payload, headers = {}) {
    const body = Buffer.from(JSON.stringify(payload));
    const enrichedHeaders = buildTracingHeaders(headers);
    this.channel.publish(this.eventsExchange, routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: enrichedHeaders,
      timestamp: Date.now(),
    });
  }

  async subscribe({ queue, routingKeys, onMessage }) {
    await this.channel.assertQueue(queue, { durable: true });
    for (const key of routingKeys) {
      await this.channel.bindQueue(queue, this.eventsExchange, key);
    }

    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString('utf8'));
        const headers = { ...(msg.properties.headers || {}), routingKey: msg.fields.routingKey };
        await runWithRequestContext(toRequestContextFromHeaders(headers), async () => {
          await onMessage(payload, headers);
        });
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error({ err: error, queue }, 'rabbit_consume_failed');
        this.channel.nack(msg, false, false);
      }
    });
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

