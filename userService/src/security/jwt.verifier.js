import { decodeProtectedHeader, jwtVerify } from 'jose';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class JwtVerifier {
  constructor({ keyService, issuer, audience }) {
    this.keyService = keyService;
    this.issuer = issuer;
    this.audience = audience;
  }

  async verifyAccessToken(token) {
    try {
      const header = decodeProtectedHeader(token);
      const key = await this.keyService.getVerifyKeyByKid(header.kid);
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      });
      return payload;
    } catch {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid or expired token');
    }
  }
}

