import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EnforcementNotificationService } from '../../src/services/enforcement-notification.service.js';

const baseEnv = {
  REDIS_URL: 'redis://localhost:6379',
  ENFORCEMENT_QUEUE_NAME: 'test-enforcement.q',
  DRIVER_WAIT_WARNING_OFFSET_SECONDS: 180,
  DRIVER_WAIT_TOTAL_SECONDS: 300,
  RABBITMQ_QUEUE_NOTIFICATION_ENFORCEMENT: 'test.q',
};

const noopClose = async () => {};

const makeService = (overrides = {}) => {
  const queue = {
    add: jest.fn(async () => {}),
    getJob: jest.fn(async () => null),
    close: noopClose,
  };

  const worker = {
    on: jest.fn(),
    close: noopClose,
  };

  const redis = {
    quit: noopClose,
  };

  const rabbitBus = {
    subscribe: jest.fn(async () => {}),
    publishEvent: jest.fn(async () => {}),
  };

  const timerRepository = {
    upsertActive: jest.fn(async () => ({})),
    findByOrderId: jest.fn(async () => ({ state: 'ACTIVE' })),
    markWarningSent: jest.fn(async () => ({})),
    markCancelled: jest.fn(async () => ({})),
    markExpired: jest.fn(async () => ({})),
  };

  const orderStateRepository = {
    upsertFromDriverArrived: jest.fn(async () => ({})),
    markScanned: jest.fn(async () => ({})),
    markExpired: jest.fn(async () => ({})),
    findByOrderId: jest.fn(async () => ({ qrScanned: false, status: 'DRIVER_ARRIVED' })),
  };

  const smsSender = {
    send: jest.fn(async () => ({ accepted: true })),
  };

  const pushSender = {
    send: jest.fn(async () => ({ accepted: true })),
  };

  const templates = {
    buildDriverWaitingPush: jest.fn(() => ({ title: 'Driver is waiting', body: 'Driver is waiting' })),
    buildThreeMinutesWarningSms: jest.fn(() => 'Warning: 3 mins left before account suspension.'),
    buildFraudDetectedSms: jest.fn(() => 'FRAUD DETECTED'),
  };

  const service = new EnforcementNotificationService({
    env: baseEnv,
    logger: { info: jest.fn(), error: jest.fn() },
    rabbitBus,
    timerRepository,
    orderStateRepository,
    pushSender,
    smsSender,
    templates,
    queue,
    worker,
    redis,
    ...overrides,
  });

  return {
    service,
    queue,
    rabbitBus,
    timerRepository,
    orderStateRepository,
    smsSender,
    pushSender,
    templates,
  };
};

describe('EnforcementNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test A: handles order.driver.arrived then warning job emits SMS + timer event', async () => {
    const { service, queue, rabbitBus, smsSender, timerRepository, orderStateRepository } = makeService();

    await service.handleDriverArrived({
      orderId: 'order-1',
      userId: 'user-1',
      restaurantId: 'rest-1',
      phoneNumber: '+12025550100',
      pushToken: 'push-token-1',
      arrivedAt: new Date().toISOString(),
    });

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(timerRepository.upsertActive).toHaveBeenCalled();
    expect(orderStateRepository.upsertFromDriverArrived).toHaveBeenCalled();

    await service.processTimerJob({
      name: 'warning',
      data: {
        orderId: 'order-1',
        userId: 'user-1',
        phoneNumber: '+12025550100',
      },
    });

    expect(smsSender.send).toHaveBeenCalledTimes(1);
    expect(rabbitBus.publishEvent).toHaveBeenCalledWith(
      'timer.3_minutes_left',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('Test B: race condition - qr.scanned before expiry suppresses fraud notification', async () => {
    const { service, rabbitBus, smsSender, timerRepository, orderStateRepository } = makeService();

    await service.handleDriverArrived({
      orderId: 'order-2',
      userId: 'user-2',
      restaurantId: 'rest-2',
      phoneNumber: '+12025550101',
    });

    await service.handleQrScanned({ orderId: 'order-2' });

    orderStateRepository.findByOrderId.mockResolvedValue({ qrScanned: true, status: 'QR_SCANNED' });

    await service.processTimerJob({
      name: 'expire',
      data: {
        orderId: 'order-2',
        userId: 'user-2',
        phoneNumber: '+12025550101',
        debtAmount: 55,
        idNumberMasked: 'ID-***-44',
      },
    });

    expect(rabbitBus.publishEvent).not.toHaveBeenCalledWith('order.qr.expired', expect.any(Object));
    expect(smsSender.send).toHaveBeenCalledTimes(0);
    expect(timerRepository.markCancelled).toHaveBeenCalled();
  });
});
