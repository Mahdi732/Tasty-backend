import { exportJWK, importSPKI } from 'jose';

export class JwksConfig {
  constructor(envConfig) {
    this.env = envConfig;
  }

  async getPublicJwks() {
    const keys = [];

    const activePublicKey = await importSPKI(this.env.JWT_PUBLIC_KEY, 'RS256');
    const activeJwk = await exportJWK(activePublicKey);
    keys.push({
      ...activeJwk,
      kid: this.env.JWT_ACTIVE_KID,
      use: 'sig',
      alg: 'RS256',
    });

    if (this.env.JWT_PREVIOUS_PUBLIC_KEY && this.env.JWT_PREVIOUS_KID) {
      const previousPublicKey = await importSPKI(this.env.JWT_PREVIOUS_PUBLIC_KEY, 'RS256');
      const previousJwk = await exportJWK(previousPublicKey);
      keys.push({
        ...previousJwk,
        kid: this.env.JWT_PREVIOUS_KID,
        use: 'sig',
        alg: 'RS256',
      });
    }

    return { keys };
  }
}

