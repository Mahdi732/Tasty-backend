import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export class IdCardVaultService {
  constructor({ encryptionKey }) {
    const decoded = Buffer.from(String(encryptionKey || ''), 'base64');
    if (decoded.length !== 32) {
      throw new Error('ID_CARD_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    }
    this.key = decoded;
  }

  encrypt(idCardBuffer) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(idCardBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Stored format: IV(12) + TAG(16) + CIPHERTEXT
    return Buffer.concat([iv, tag, encrypted]);
  }
}

