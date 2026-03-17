import amqplib from 'amqplib';
import { EVENTS } from '../constants/messaging.js';

const extractOwnerIds = (payload) => {
  const candidates = [
    payload?.ownerId,
    payload?.owner_id,
    payload?.userId,
    payload?.user_id,
  ];

  return [...new Set(candidates.filter(Boolean).map(String))];
};

export class PaymentConsumer {
  constructor({ url, exchange, queueName, routingKey, restaurantRepository, logger }) {
    this.url = url;
    this.exchange = exchange;
    this.queueName = queueName;
    this.routingKey = routingKey || EVENTS.PAYMENT_SUBSCRIPTION_SUCCESS;
    this.restaurantRepository = restaurantRepository;
    this.logger = logger;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    await this.channel.assertQueue(this.queueName, { durable: true });
    await this.channel.bindQueue(this.queueName, this.exchange, this.routingKey);
  }

  async start() {
    if (!this.channel) {
      throw new Error('Payment consumer channel is not initialized');
    }

    await this.channel.consume(this.queueName, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString('utf8'));
        const ownerIds = extractOwnerIds(payload);

        if (!ownerIds.length) {
          this.logger?.warn({ payload }, 'payment_subscription_success_missing_owner_id');
          this.channel.ack(msg);
          return;
        }

        const result = await this.restaurantRepository.activateByOwnerIds(ownerIds);

        this.logger?.info(
          {
            routingKey: this.routingKey,
            ownerIds,
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
          },
          'payment_subscription_success_processed'
        );

        this.channel.ack(msg);
      } catch (error) {
        this.logger?.error({ err: error, queue: this.queueName }, 'payment_subscription_consume_failed');
        this.channel.nack(msg, false, false);
      }
    });
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
