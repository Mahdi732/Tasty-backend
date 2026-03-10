import cron from 'node-cron';

export class QrExpiryScammerTrapJob {
  constructor({ env, orderService, logger }) {
    this.env = env;
    this.orderService = orderService;
    this.logger = logger;
    this.task = null;
  }

  start() {
    if (this.env.NODE_ENV === 'test') {
      return;
    }

    this.task = cron.schedule(this.env.QR_EXPIRY_SCAN_CRON, async () => {
      const result = await this.orderService.processExpiredQrOrders({
        limit: this.env.QR_EXPIRY_SCAN_BATCH_SIZE,
      });
      if (result.processed > 0) {
        this.logger.warn({ processed: result.processed }, 'qr_expiry_scammer_trap_applied');
      }
    });
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}

