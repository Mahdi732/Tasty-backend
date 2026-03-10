import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class FaceBlacklistClient {
  constructor({ baseUrl, apiKey, tenantId, timeoutMs, logger }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.tenantId = tenantId;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  async addDebtor({ userId, debtAmount, requestId }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        tenantId: this.tenantId,
        personRef: userId,
        reason: `QR_EXPIRED_DEBT:${debtAmount}`,
      };

      const response = await fetch(`${this.baseUrl}/v1/faces/blacklist/debtor`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'x-request-id': requestId || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        this.logger.error({ data, userId }, 'face_blacklist_activate_failed');
        throw new ApiError(502, ERROR_CODES.INTERNAL_ERROR, 'Failed to sync debtor to face blacklist');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      this.logger.error({ err: error, userId }, 'face_blacklist_unreachable');
      throw new ApiError(503, ERROR_CODES.INTERNAL_ERROR, 'Face blacklist service unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}

