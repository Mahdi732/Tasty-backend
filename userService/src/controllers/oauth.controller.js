import { ok } from '../utils/api-response.js';

const attachRefreshToken = (res, env, refreshToken) => {
  if (env.REFRESH_TOKEN_TRANSPORT === 'cookie' || env.REFRESH_TOKEN_TRANSPORT === 'both') {
    res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      domain: env.COOKIE_DOMAIN || undefined,
      path: '/auth',
      maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }
};

export class OAuthController {
  constructor({ env, oauthService }) {
    this.env = env;
    this.oauthService = oauthService;
  }

  start = async (req, res) => {
    const result = await this.oauthService.start(req.params.provider, {
      mode: req.query.mode,
      platform: req.query.platform,
      appRedirect: req.query.appRedirect,
      currentUserId: req.auth?.userId || null,
    });
    return ok(res, result);
  };

  callback = async (req, res) => {
    const result = await this.oauthService.callback(
      req.params.provider,
      { code: req.query.code, state: req.query.state },
      {
        ipAddress: req.clientIp,
        userAgent: req.userAgent,
      }
    );

    if (result.refreshToken) {
      attachRefreshToken(res, this.env, result.refreshToken);
    }

    const oauthContext = result.oauthContext || {};
    const shouldRedirectToWeb = oauthContext.mode === 'login' && oauthContext.platform === 'web';

    if (shouldRedirectToWeb) {
      const redirectBase = oauthContext.appRedirect || `${this.env.WEB_APP_URL}/oauth/callback`;
      const redirectUrl = new URL(redirectBase);
      redirectUrl.searchParams.set('provider', req.params.provider);
      redirectUrl.searchParams.set('accessToken', result.accessToken || '');
      if (result.refreshToken) {
        redirectUrl.searchParams.set('refreshToken', result.refreshToken);
      }
      return res.redirect(302, redirectUrl.toString());
    }

    return ok(res, {
      ...result,
      refreshToken: this.env.REFRESH_TOKEN_TRANSPORT === 'cookie' ? undefined : result.refreshToken,
    });
  };

  link = async (req, res) => {
    const result = await this.oauthService.start(req.params.provider, {
      mode: 'link',
      platform: req.body?.platform || 'web',
      currentUserId: req.auth.userId,
    });
    return ok(res, result);
  };

  unlink = async (req, res) => {
    const result = await this.oauthService.unlinkProvider(req.auth.userId, req.params.provider);
    return ok(res, result);
  };
}
