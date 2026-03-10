import { v4 as uuidv4 } from 'uuid';
import { randomUrlSafe } from './crypto.utils.js';

export class TokenGenerator {
  createSessionId() {
    return uuidv4();
  }

  createFamilyId() {
    return uuidv4();
  }

  createRefreshSecret() {
    return randomUrlSafe(48);
  }

  buildRefreshToken(sessionId, secret) {
    return `${sessionId}.${secret}`;
  }
}

