export class AuthMetaController {
  constructor(jwksConfig) {
    this.jwksConfig = jwksConfig;
  }

  jwks = async (_req, res) => {
    const jwks = await this.jwksConfig.getPublicJwks();
    return res.status(200).json(jwks);
  };
}

