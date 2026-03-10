import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

const withTimeout = async (promiseFactory, timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

export class FaceRecognitionClient {
  constructor({ baseUrl, apiKey, timeoutMs, logger }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
  }

  async post(path, payload, requestId) {
    try {
      const response = await withTimeout(
        (signal) =>
          fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': this.apiKey,
              'x-request-id': requestId || '',
            },
            body: JSON.stringify(payload),
            signal,
          }),
        this.timeoutMs
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || data?.message || 'Face service request failed';
        throw new ApiError(response.status, ERROR_CODES.FACE_SERVICE_UNAVAILABLE, message, data);
      }

      return data?.data ?? data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      this.logger.warn({ err: error }, 'face_service_unreachable');
      throw new ApiError(503, ERROR_CODES.FACE_SERVICE_UNAVAILABLE, 'Face service is unavailable');
    }
  }

  async searchWatchlists({ imageBase64, tenantId, threshold, requestId }) {
    return this.post(
      '/v1/faces/search',
      {
        imageBase64,
        tenantId,
        targetLists: ['BANNED', 'DEBTOR'],
        topK: 5,
        threshold,
      },
      requestId
    );
  }

  async activateIdentity({ imageBase64, tenantId, personRef, requestId }) {
    return this.post(
      '/v1/faces/activate',
      {
        imageBase64,
        tenantId,
        personRef,
        listType: 'NORMAL',
        reason: 'mandatory-account-activation',
      },
      requestId
    );
  }

  async compareIdWithFace({ idCardImageBase64, liveImageBase64, tenantId, requestId }) {
    return this.post(
      '/v1/faces/compare-id',
      {
        idCardImageBase64,
        liveImageBase64,
        tenantId,
      },
      requestId
    );
  }
}
