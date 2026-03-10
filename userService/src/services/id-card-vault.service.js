import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export class IdCardVaultService {
  constructor({ encryptionKey }) {
    this.key = Buffer.from(encryptionKey, 'base64');
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

