import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { EVENTS } from '../constants/messaging.js';
import { runWithRequestContext } from '../../../common/src/tracing/context.js';

const JOB_TYPES = Object.freeze({
  WARNING: 'warning',
  EXPIRE: 'expire',
});

export class EnforcementNotificationService {
  constructor({
    env,
    logger,
    rabbitBus,
    timerRepository,
    orderStateRepository,
    pushSender,
    smsSender,
    templates,
    realtimeGateway,
    queue,
    worker,
    redis,
  }) {
    this.env = env;
    this.logger = logger;
    this.rabbitBus = rabbitBus;
    this.timerRepository = timerRepository;
    this.orderStateRepository = orderStateRepository;
    this.pushSender = pushSender;
    this.smsSender = smsSender;
    this.templates = templates;
    this.realtimeGateway = realtimeGateway;

    this.redis = redis || new IORedis(this.env.REDIS_URL, { maxRetriesPerRequest: null });
    this.queue = queue || new Queue(this.env.ENFORCEMENT_QUEUE_NAME, { connection: this.redis });
    this.worker = worker || new Worker(
      this.env.ENFORCEMENT_QUEUE_NAME,
      async (job) => this.processTimerJob(job),
      { connection: this.redis }
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error({ err: error, jobId: job?.id }, 'enforcement_timer_job_failed');
    });
  }

  async start() {
    await this.rabbitBus.subscribe({
      queue: this.env.RABBITMQ_QUEUE_NOTIFICATION_ENFORCEMENT,
      routingKeys: [EVENTS.ORDER_DRIVER_ARRIVED, EVENTS.ORDER_QR_SCANNED, EVENTS.ORDER_QR_EXPIRED],
      onMessage: (payload, headers) => this.onEvent(payload, headers),
    });
  }

  async onEvent(payload, headers = {}) {
    const routingKey = headers.routingKey;

    if (routingKey === EVENTS.ORDER_DRIVER_ARRIVED) {
      await this.handleDriverArrived(payload, headers);
      return;
    }

    if (routingKey === EVENTS.ORDER_QR_SCANNED) {
      await this.handleQrScanned(payload);
      return;
    }

    if (routingKey === EVENTS.ORDER_QR_EXPIRED) {
      await this.handleQrExpired(payload);
    }
  }

  async handleDriverArrived(event, headers = {}) {
    const startedAt = event.arrivedAt ? new Date(event.arrivedAt) : new Date();

    await this.timerRepository.upsertActive({
      orderId: event.orderId,
      userId: event.userId,
      restaurantId: event.restaurantId,
      startedAt,
    });
    await this.orderStateRepository?.upsertFromDriverArrived({
      orderId: event.orderId,
      userId: event.userId,
      restaurantId: event.restaurantId,
    });

    if (event.pushToken) {
      const pushTemplate = this.templates.buildDriverWaitingPush({ orderId: event.orderId });
      await this.pushSender.send({
        toToken: event.pushToken,
        title: pushTemplate.title,
        body: pushTemplate.body,
        data: {
          orderId: event.orderId,
          type: EVENTS.ORDER_DRIVER_ARRIVED,
        },
      });
    }

    await this.queue.add(
      JOB_TYPES.WARNING,
      {
        orderId: event.orderId,
        userId: event.userId,
        phoneNumber: event.phoneNumber || null,
        correlationId: headers.correlationId || null,
        causationId: headers.causationId || headers.eventId || null,
      },
      {
        jobId: `arrival-warning:${event.orderId}`,
        delay: this.env.DRIVER_WAIT_WARNING_OFFSET_SECONDS * 1000,
        removeOnComplete: true,
      }
    );

    await this.queue.add(
      JOB_TYPES.EXPIRE,
      {
        orderId: event.orderId,
        userId: event.userId,
        phoneNumber: event.phoneNumber || null,
        debtAmount: event.debtAmount || 0,
        idNumberMasked: event.idNumberMasked || 'UNKNOWN',
        correlationId: headers.correlationId || null,
        causationId: headers.causationId || headers.eventId || null,
      },
      {
        jobId: `arrival-expire:${event.orderId}`,
        delay: this.env.DRIVER_WAIT_TOTAL_SECONDS * 1000,
        removeOnComplete: true,
      }
    );

    this.logger.info({ orderId: event.orderId, eventId: headers.eventId || null }, 'enforcement_timer_scheduled');
  }

  async handleQrScanned(event) {
    await this.cancelTimerJobs(event.orderId);
    await this.timerRepository.markCancelled(event.orderId, new Date());
    await this.orderStateRepository?.markScanned(event.orderId);
  }

  async handleQrExpired(event) {
    const existing = await this.timerRepository.findByOrderId(event.orderId);
    if (existing?.state === 'EXPIRED' || existing?.state === 'CANCELLED') {
      return;
    }

    // Final guard: double-check order state in DB before any SMS emission.
    if (!(await this.canSendSmsForOrder(event.orderId))) {
      await this.timerRepository.markCancelled(event.orderId, new Date());
      await this.cancelTimerJobs(event.orderId);
      return;
    }

    const idNumberMasked = event.idNumberMasked || 'UNKNOWN';
    const debtAmount = Number(event.debtAmount || 0).toFixed(2);

    if (event.phoneNumber) {
      const text = this.templates.buildFraudDetectedSms({
        idNumberMasked,
        amount: debtAmount,
      });
      await this.smsSender.send({ toPhoneNumber: event.phoneNumber, text });
    }

    await this.timerRepository.markExpired(event.orderId, new Date());
    await this.orderStateRepository?.markExpired(event.orderId);
    await this.cancelTimerJobs(event.orderId);
  }

  async processTimerJob(job) {
    const requestContext = {
      requestId: job.data.causationId || job.data.correlationId || null,
      correlationId: job.data.correlationId || null,
    };

    await runWithRequestContext(requestContext, async () => {
      if (job.name === JOB_TYPES.WARNING) {
        const timer = await this.timerRepository.findByOrderId(job.data.orderId);
        if (!timer || !['ACTIVE', 'WARNING_SENT'].includes(timer.state)) {
          return;
        }

        if (job.data.phoneNumber && (await this.canSendSmsForOrder(job.data.orderId))) {
          const text = this.templates.buildThreeMinutesWarningSms({ orderId: job.data.orderId });
          await this.smsSender.send({ toPhoneNumber: job.data.phoneNumber, text });
        }

        await this.timerRepository.markWarningSent(job.data.orderId, new Date());
        this.realtimeGateway?.emitTimerUpdate({
          userId: job.data.userId,
          orderId: job.data.orderId,
          event: 'timer.update',
          status: 'warning',
        });
        await this.rabbitBus.publishEvent(
          EVENTS.TIMER_3_MINUTES_LEFT,
          {
            orderId: job.data.orderId,
            userId: job.data.userId,
          },
          {
            correlationId: job.data.correlationId || undefined,
            causationId: job.data.causationId || undefined,
          }
        );
        return;
      }

      if (job.name === JOB_TYPES.EXPIRE) {
        const timer = await this.timerRepository.findByOrderId(job.data.orderId);
        if (!timer || timer.state === 'CANCELLED' || timer.state === 'EXPIRED') {
          return;
        }

        if (!(await this.canSendSmsForOrder(job.data.orderId))) {
          await this.timerRepository.markCancelled(job.data.orderId, new Date());
          return;
        }

        await this.rabbitBus.publishEvent(
          EVENTS.ORDER_QR_EXPIRED,
          {
            orderId: job.data.orderId,
            userId: job.data.userId,
            debtAmount: job.data.debtAmount || 0,
            idNumberMasked: job.data.idNumberMasked || 'UNKNOWN',
            reason: 'DRIVER_WAIT_TIMER_EXPIRED',
          },
          {
            correlationId: job.data.correlationId || undefined,
            causationId: job.data.causationId || undefined,
          }
        );

        this.realtimeGateway?.emitOrderExpired({
          userId: job.data.userId,
          orderId: job.data.orderId,
          debtAmount: job.data.debtAmount || 0,
          idNumberMasked: job.data.idNumberMasked || 'UNKNOWN',
        });

        this.logger.info({ orderId: job.data.orderId }, 'enforcement_expire_timer_elapsed');
      }
    });
  }

  async canSendSmsForOrder(orderId) {
    if (!this.orderStateRepository) {
      return true;
    }

    const state = await this.orderStateRepository.findByOrderId(orderId);
    if (!state) {
      return false;
    }

    return state.qrScanned !== true && state.status !== 'QR_SCANNED';
  }

  async cancelTimerJobs(orderId) {
    const warningJob = await this.queue.getJob(`arrival-warning:${orderId}`);
    if (warningJob) {
      await warningJob.remove();
    }

    const expireJob = await this.queue.getJob(`arrival-expire:${orderId}`);
    if (expireJob) {
      await expireJob.remove();
    }
  }

  async close() {
    if (this.worker?.close) {
      await this.worker.close();
    }
    if (this.queue?.close) {
      await this.queue.close();
    }
    if (this.redis?.quit) {
      await this.redis.quit();
    }
  }
}
