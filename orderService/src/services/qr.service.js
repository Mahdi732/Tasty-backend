import crypto from 'crypto';

export class QrService {
  constructor({ signingSecret, ttlSeconds }) {
    this.signingSecret = signingSecret;
    this.ttlSeconds = ttlSeconds;
  }

  hashToken(rawToken) {
    return crypto.createHmac('sha256', this.signingSecret).update(rawToken).digest('hex');
  }

  buildTokenPayload({ orderId, restaurantId }) {
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    const data = JSON.stringify({ orderId, restaurantId, nonce, exp: expiresAt.toISOString() });
    const signature = crypto.createHmac('sha256', this.signingSecret).update(data).digest('hex');
    const rawToken = Buffer.from(JSON.stringify({ data, signature })).toString('base64url');
    return { rawToken, tokenHash: this.hashToken(rawToken), expiresAt };
  }

  verifyToken(rawToken) {
    const decoded = JSON.parse(Buffer.from(rawToken, 'base64url').toString('utf8'));
    const expectedSignature = crypto.createHmac('sha256', this.signingSecret).update(decoded.data).digest('hex');
    if (expectedSignature !== decoded.signature) return { valid: false };

    const payload = JSON.parse(decoded.data);
    if (new Date(payload.exp) <= new Date()) return { valid: false };

    return { valid: true, payload };
  }
}

