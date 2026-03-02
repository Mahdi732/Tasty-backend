import mongoose from 'mongoose';

export class HealthController {
  constructor({ redisClient, redisEnabled }) {
    this.redisClient = redisClient;
    this.redisEnabled = redisEnabled;
  }

  health = async (_req, res) => {
    return res.status(200).json({ success: true, data: { status: 'ok' } });
  };

  ready = async (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = this.redisEnabled ? Boolean(this.redisClient?.isOpen) : true;
    const ready = mongoReady && redisReady;

    return res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        status: ready ? 'ready' : 'not_ready',
        checks: { mongoReady, redisReady },
      },
    });
  };
}
