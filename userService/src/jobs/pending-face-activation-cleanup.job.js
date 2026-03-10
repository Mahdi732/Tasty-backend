import cron from 'node-cron';

export class PendingFaceActivationCleanupJob {
  constructor({ env, userRepository, domainEventPublisher, logger }) {
    this.env = env;
    this.userRepository = userRepository;
    this.domainEventPublisher = domainEventPublisher;
    this.logger = logger;
    this.task = null;
  }

  start() {
    if (this.env.NODE_ENV === 'test') {
      return;
    }

    this.task = cron.schedule(this.env.JANITOR_CRON_SCHEDULE, async () => {
      await this.runOnce();
    });

    this.logger.info({ cron: this.env.JANITOR_CRON_SCHEDULE }, 'pending_face_activation_cleanup_started');
  }

  async runOnce() {
    const now = new Date();
    const expiredUsers = await this.userRepository.findExpiredPendingFaceActivation(
      now,
      this.env.JANITOR_CLEANUP_BATCH_SIZE
    );

    if (!expiredUsers.length) {
      return { deletedCount: 0 };
    }

    const ids = expiredUsers.map((user) => user._id);
    const { deletedCount = 0 } = await this.userRepository.deleteByIds(ids);

    for (const user of expiredUsers) {
      try {
        await this.domainEventPublisher.publish(this.env.USER_DELETED_CLEANUP_ROUTING_KEY, {
          userId: String(user._id),
          email: user.email,
          reason: 'PENDING_FACE_ACTIVATION_EXPIRED',
          deletedAt: now.toISOString(),
        });
      } catch (error) {
        this.logger.error({ err: error, userId: String(user._id) }, 'cleanup_event_publish_failed');
      }
    }

    this.logger.info({ deletedCount }, 'pending_face_activation_cleanup_completed');
    return { deletedCount };
  }

  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
    }
  }
}
