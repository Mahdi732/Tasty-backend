import { importPKCS8, importSPKI } from 'jose';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class KeyService {
  constructor(env) {
    this.env = env;
    this.privateKey = null;
    this.publicKeysByKid = new Map();
  }

  async init() {
    this.privateKey = await importPKCS8(this.env.JWT_PRIVATE_KEY, 'RS256');

    const activePublic = await importSPKI(this.env.JWT_PUBLIC_KEY, 'RS256');
    this.publicKeysByKid.set(this.env.JWT_ACTIVE_KID, activePublic);

    if (this.env.JWT_PREVIOUS_PUBLIC_KEY && this.env.JWT_PREVIOUS_KID) {
      const previous = await importSPKI(this.env.JWT_PREVIOUS_PUBLIC_KEY, 'RS256');
      this.publicKeysByKid.set(this.env.JWT_PREVIOUS_KID, previous);
    }
  }

  getSignKey() {
    return this.privateKey;
  }

  async getVerifyKeyByKid(kid) {
    const key = this.publicKeysByKid.get(kid);
    if (!key) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Unknown token key id');
    }
    return key;
  }
}
