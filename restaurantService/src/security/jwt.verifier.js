import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class JwtVerifier {
  constructor({ jwksUri, issuer, audience }) {
    this.issuer = issuer;
    this.audience = audience;
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  async verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        algorithms: ['RS256'],
        issuer: this.issuer,
        audience: this.audience,
      });
      return payload;
    } catch (_error) {
      throw new ApiError(401, ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid or expired token');
    }
  }
}

