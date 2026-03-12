import { ok } from '../utils/api-response.js';

export class HealthController {
  ping = async (_req, res) => ok(res, { status: 'ok' });
}
