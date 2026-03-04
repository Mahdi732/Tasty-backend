import mongoose from 'mongoose';

export class HealthController {
  constructor({ rabbitBus }) {
    this.rabbitBus = rabbitBus;
  }

  health = async (_req, res) => {
    return res.status(200).json({ success: true, data: { status: 'ok' } });
  };

  ready = async (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const rabbitReady = Boolean(this.rabbitBus?.channel);
    const ready = mongoReady && rabbitReady;

    return res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        status: ready ? 'ready' : 'not_ready',
        checks: { mongoReady, rabbitReady },
      },
    });
  };
}
