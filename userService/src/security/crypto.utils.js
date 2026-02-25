import crypto from 'crypto';

export const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');

export const hmacSha256 = (secret, input) =>
  crypto.createHmac('sha256', secret).update(input).digest('hex');

export const randomUrlSafe = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');
