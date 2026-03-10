import { ok } from '../utils/api-response.js';

export class HealthController {
  live(_req, res) {
    return ok(res, { status: 'ok' });
  }
}

