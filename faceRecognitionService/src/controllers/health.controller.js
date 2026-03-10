import mongoose from 'mongoose';

export class HealthController {
  constructor({ embedderClient }) {
    this.embedderClient = embedderClient;
  }

  health = async (_req, res) => {
    return res.status(200).json({ success: true, data: { status: 'ok' } });
  };

  ready = async (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    let embedderReady = false;
    try {
      const data = await this.embedderClient.health();
      embedderReady = Boolean(data?.ok);
    } catch {
      embedderReady = false;
    }

    const ready = mongoReady && embedderReady;
    return res.status(ready ? 200 : 503).json({
      success: ready,
      data: { status: ready ? 'ready' : 'not_ready', checks: { mongoReady, embedderReady } },
    });
  };
}

