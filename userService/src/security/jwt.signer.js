import { SignJWT } from 'jose';

export class JwtSigner {
  constructor({ privateKey, issuer, audience, accessTtlSeconds, activeKid }) {
    this.privateKey = privateKey;
    this.issuer = issuer;
    this.audience = audience;
    this.accessTtlSeconds = accessTtlSeconds;
    this.activeKid = activeKid;
  }

  async signAccessToken(payload) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.activeKid, typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.privateKey);
  }
}

